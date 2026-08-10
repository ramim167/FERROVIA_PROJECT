import crypto from 'node:crypto'
import { withConnection, withTransaction } from '../config/database.js'
import {
  cancelBooking,
  confirmBookingAndReservations,
  createBooking,
  createHeldReservation,
  createPassenger,
  createPayment,
  createTicket,
  createNotification,
  createRefundRequests,
  getBookingByPnr,
  getBookingForUpdate,
  getHeldReservations,
  listUserBookings,
} from '../repositories/booking.repository.js'
import { getFareRule, getTripSegment, hasOverlap, listAvailableSeats, lockTripSeat } from '../repositories/seat.repository.js'
import { badRequest, conflict, notFound } from '../utils/httpError.js'
import { lowerKeys } from '../utils/serializers.js'

const HOLD_MINUTES = 10

function makePnr() {
  return `FRV${crypto.randomBytes(5).toString('hex').toUpperCase()}`
}

function makeTransactionId() {
  return `DEMO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

function fareForSegment(segment, fareRule) {
  const distance = Number(segment.DEST_DISTANCE_KM) - Number(segment.SOURCE_DISTANCE_KM)
  if (distance <= 0) throw badRequest('Invalid route distance for selected segment')
  return Math.round((Number(fareRule.BASE_FARE) + distance * Number(fareRule.RATE_PER_KM)) * 100) / 100
}

export async function availableSeats(query) {
  const { tripId, sourceStationId, destinationStationId, classId } = query
  if (!tripId || !sourceStationId || !destinationStationId) {
    throw badRequest('tripId, sourceStationId and destinationStationId are required')
  }

  return withConnection(async (connection) => {
    const result = await listAvailableSeats(connection, {
      tripId: Number(tripId),
      sourceStationId: Number(sourceStationId),
      destinationStationId: Number(destinationStationId),
      classId: classId ? Number(classId) : null,
    })
    if (!result.segment) throw badRequest('Invalid journey segment for this trip')

    let fare = null
    if (classId) {
      const fareRule = await getFareRule(connection, result.segment.TRAIN_ID, Number(classId))
      if (fareRule) fare = fareForSegment(result.segment, fareRule)
    }

    return lowerKeys({ ...result, farePerPassenger: fare })
  })
}


export async function availableClasses(query) {
  const { tripId, sourceStationId, destinationStationId } = query
  if (!tripId || !sourceStationId || !destinationStationId) {
    throw badRequest('tripId, sourceStationId and destinationStationId are required')
  }

  return withConnection(async (connection) => {
    const result = await listAvailableSeats(connection, {
      tripId: Number(tripId),
      sourceStationId: Number(sourceStationId),
      destinationStationId: Number(destinationStationId),
      classId: null,
    })
    if (!result.segment) throw badRequest('Invalid journey segment for this trip')

    const grouped = new Map()
    for (const seat of result.seats) {
      const key = Number(seat.CLASS_ID)
      if (!grouped.has(key)) {
        grouped.set(key, {
          classId: key,
          className: seat.CLASS_NAME,
          classCode: seat.CLASS_CODE,
          availableSeats: 0,
        })
      }
      if (Number(seat.IS_AVAILABLE) === 1) grouped.get(key).availableSeats += 1
    }

    const classes = []
    for (const item of grouped.values()) {
      const fareRule = await getFareRule(connection, result.segment.TRAIN_ID, item.classId)
      classes.push({
        ...item,
        farePerPassenger: fareRule ? fareForSegment(result.segment, fareRule) : null,
      })
    }
    classes.sort((a, b) => Number(a.farePerPassenger || 0) - Number(b.farePerPassenger || 0))
    return classes
  })
}

export async function createPendingBooking(userId, payload) {
  const { tripId, sourceStationId, destinationStationId, classId, passengers } = payload
  if (!tripId || !sourceStationId || !destinationStationId || !classId || !Array.isArray(passengers) || !passengers.length) {
    throw badRequest('tripId, sourceStationId, destinationStationId, classId and passengers are required')
  }
  if (passengers.some((p) => !p.name || !p.age || !p.gender || !p.tripSeatId)) {
    throw badRequest('Each passenger requires name, age, gender and tripSeatId')
  }
  if (passengers.some((p) => Number(p.age) < 1 || Number(p.age) > 120)) {
    throw badRequest('Passenger age must be between 1 and 120')
  }
  const seatIds = passengers.map((p) => Number(p.tripSeatId))
  if (new Set(seatIds).size !== seatIds.length) throw badRequest('The same seat cannot be selected twice')

  return withTransaction(async (connection) => {
    const segment = await getTripSegment(connection, Number(tripId), Number(sourceStationId), Number(destinationStationId))
    if (!segment) throw badRequest('Invalid source/destination for this trip')

    const fareRule = await getFareRule(connection, segment.TRAIN_ID, Number(classId))
    if (!fareRule) throw badRequest('No fare rule exists for the selected train/class')
    const perPassengerFare = fareForSegment(segment, fareRule)
    const totalFare = Math.round(perPassengerFare * passengers.length * 100) / 100

    for (const passenger of passengers) {
      const seat = await lockTripSeat(connection, Number(passenger.tripSeatId))
      if (!seat || Number(seat.TRIP_ID) !== Number(tripId) || seat.SEAT_STATUS !== 'AVAILABLE') {
        throw conflict(`Seat ${passenger.tripSeatId} is unavailable`)
      }
      if (Number(seat.CLASS_ID) !== Number(classId)) {
        throw badRequest(`Seat ${passenger.tripSeatId} does not belong to the selected class`)
      }
      if (await hasOverlap(connection, {
        tripSeatId: Number(passenger.tripSeatId),
        sourceSeq: Number(segment.SOURCE_SEQ),
        destSeq: Number(segment.DEST_SEQ),
      })) {
        throw conflict(`Seat ${passenger.tripSeatId} is already occupied on this segment`)
      }
    }

    let bookingId
    let pnr
    for (let attempt = 0; attempt < 3; attempt += 1) {
      pnr = makePnr()
      try {
        bookingId = await createBooking(connection, {
          pnr,
          userId,
          tripId: Number(tripId),
          sourceStationId: Number(sourceStationId),
          destinationStationId: Number(destinationStationId),
          classId: Number(classId),
          totalFare,
        })
        break
      } catch (error) {
        if (!String(error.message).includes('UQ_PNR_NUMBER') || attempt === 2) throw error
      }
    }

    for (const passenger of passengers) {
      const passengerId = await createPassenger(connection, bookingId, {
        name: passenger.name,
        age: Number(passenger.age),
        gender: String(passenger.gender).toUpperCase(),
      })
      await createHeldReservation(connection, {
        bookingId,
        passengerId,
        tripSeatId: Number(passenger.tripSeatId),
        sourceStationId: Number(sourceStationId),
        destinationStationId: Number(destinationStationId),
        sourceSeq: Number(segment.SOURCE_SEQ),
        destSeq: Number(segment.DEST_SEQ),
        holdMinutes: HOLD_MINUTES,
      })
    }

    const booking = await getBookingByPnr(connection, pnr, userId)
    return lowerKeys({ ...booking, farePerPassenger: perPassengerFare, holdMinutes: HOLD_MINUTES })
  })
}

export async function payBooking(userId, pnr, payload = {}) {
  const method = String(payload.method || 'MOBILE_BANKING').toUpperCase()
  const allowed = ['CARD', 'MOBILE_BANKING', 'BANK_TRANSFER', 'CASH']
  if (!allowed.includes(method)) throw badRequest(`payment method must be one of: ${allowed.join(', ')}`)

  return withTransaction(async (connection) => {
    const booking = await getBookingForUpdate(connection, pnr, userId)
    if (!booking) throw notFound('Booking not found')
    if (booking.BOOKING_STATUS !== 'PENDING') throw badRequest(`Booking is ${booking.BOOKING_STATUS.toLowerCase()}`)

    const reservations = await getHeldReservations(connection, booking.BOOKING_ID)
    if (!reservations.length) throw conflict('No active seat holds remain for this booking')
    if (reservations.some((r) => !r.HOLD_EXPIRES_AT || new Date(r.HOLD_EXPIRES_AT).getTime() <= Date.now())) {
      throw conflict('Seat hold expired. Please select seats again.')
    }

    const transactionId = payload.transactionId || makeTransactionId()
    await createPayment(connection, {
      bookingId: booking.BOOKING_ID,
      transactionId,
      amount: Number(booking.TOTAL_FARE),
      method,
      status: 'SUCCESSFUL',
    })

    await confirmBookingAndReservations(connection, booking.BOOKING_ID)
    const farePerPassenger = Number(booking.TOTAL_FARE) / reservations.length
    for (const reservation of reservations) {
      await createTicket(connection, {
        passengerId: reservation.PASSENGER_ID,
        reservationId: reservation.RESERVATION_ID,
        fare: farePerPassenger,
      })
    }
    await createNotification(connection, {
      userId,
      bookingId: booking.BOOKING_ID,
      tripId: booking.TRIP_ID,
      title: 'Booking confirmed',
      message: `Your booking ${pnr} is confirmed and your e-ticket is ready.`,
    })

    return lowerKeys(await getBookingByPnr(connection, pnr, userId))
  })
}

export async function getUserBooking(userId, pnr) {
  return withConnection(async (connection) => {
    const booking = await getBookingByPnr(connection, pnr, userId)
    if (!booking) throw notFound('Booking not found')
    return lowerKeys(booking)
  })
}

export async function getUserBookings(userId) {
  return withConnection(async (connection) => lowerKeys(await listUserBookings(connection, userId)))
}

export async function cancelUserBooking(userId, pnr) {
  return withTransaction(async (connection) => {
    const booking = await getBookingForUpdate(connection, pnr, userId)
    if (!booking) throw notFound('Booking not found')
    if (!['PENDING', 'CONFIRMED'].includes(booking.BOOKING_STATUS)) {
      throw badRequest(`Booking is ${booking.BOOKING_STATUS.toLowerCase()}`)
    }
    const wasConfirmed = booking.BOOKING_STATUS === 'CONFIRMED'
    if (wasConfirmed) await createRefundRequests(connection, booking.BOOKING_ID)
    await cancelBooking(connection, booking.BOOKING_ID)
    await createNotification(connection, {
      userId,
      bookingId: booking.BOOKING_ID,
      tripId: booking.TRIP_ID,
      title: 'Booking cancelled',
      message: wasConfirmed
        ? `Booking ${pnr} was cancelled. A refund request has been created for each issued ticket.`
        : `Pending booking ${pnr} was cancelled and its seat hold was released.`,
    })
    return { pnr, status: 'cancelled', refundRequested: wasConfirmed }
  })
}
