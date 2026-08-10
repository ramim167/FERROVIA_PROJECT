import { withConnection, withTransaction } from '../config/database.js'
import {
  completeTrip,
  getLiveTrip,
  getTrip,
  getTripStopForUpdate,
  getTripStops,
  listOperatorTrips,
  markArrived,
  markDeparted,
  markTripStarted,
  previousStopCompleted,
} from '../repositories/trip.repository.js'
import { activateCurrentTrainset, finishTrainsetRotation, reserveSpareAfterDelay } from './trainset.service.js'
import { badRequest, forbidden, notFound } from '../utils/httpError.js'
import { lowerKeys } from '../utils/serializers.js'

function ensureAssignedOperator(trip, user) {
  if (user.role === 'ADMIN') return
  if (Number(trip.OPERATOR_USER_ID) !== Number(user.userId)) {
    throw forbidden('This trip is not assigned to this operator')
  }
}

async function calculateStopDelay(connection, tripStopId) {
  const result = await connection.execute(
    `SELECT CASE
              WHEN ACTUAL_DEPARTURE IS NULL OR SCHEDULED_DEPARTURE IS NULL THEN 0
              ELSE GREATEST(0, ROUND((CAST(ACTUAL_DEPARTURE AS DATE) - CAST(SCHEDULED_DEPARTURE AS DATE)) * 1440))
            END AS DELAY_MINUTES
       FROM TRIP_STOPS
      WHERE TRIP_STOP_ID = :tripStopId`,
    { tripStopId }
  )
  return Number(result.rows[0]?.DELAY_MINUTES || 0)
}

export async function operatorTrips(user, date) {
  return withConnection(async (connection) => {
    const rows = await listOperatorTrips(connection, user.userId, date, user.role === 'ADMIN')
    return lowerKeys(rows)
  })
}

export async function tripOperations(user, tripId) {
  return withConnection(async (connection) => {
    const trip = await getTrip(connection, tripId)
    if (!trip) throw notFound('Trip not found')
    ensureAssignedOperator(trip, user)
    const [stops, live] = await Promise.all([getTripStops(connection, tripId), getLiveTrip(connection, tripId)])
    return lowerKeys({ trip, live, stops })
  })
}

export async function arriveAtStop(user, tripId, tripStopId) {
  return withTransaction(async (connection) => {
    const trip = await getTrip(connection, tripId, true)
    if (!trip) throw notFound('Trip not found')
    ensureAssignedOperator(trip, user)
    if (['COMPLETED','CANCELLED'].includes(trip.TRIP_STATUS)) throw badRequest(`Trip is ${trip.TRIP_STATUS.toLowerCase()}`)

    const stop = await getTripStopForUpdate(connection, tripId, tripStopId)
    if (!stop) throw notFound('Trip stop not found')
    if (!stop.SCHEDULED_ARRIVAL) throw badRequest('This is the source stop; use Departed instead of Arrived')
    if (stop.ACTUAL_ARRIVAL) throw badRequest('Arrival has already been marked')
    if (!(await previousStopCompleted(connection, tripId, stop.STOP_SEQUENCE))) {
      throw badRequest('Previous station must be departed before this arrival can be marked')
    }

    await markArrived(connection, { tripStopId, operatorId: user.userId })

    const stops = await getTripStops(connection, tripId)
    const isDestination = Number(stop.STOP_SEQUENCE) === Math.max(...stops.map((s) => Number(s.STOP_SEQUENCE)))
    let rotation = null

    if (isDestination) {
      await completeTrip(connection, tripId)
      const updatedTrip = await getTrip(connection, tripId, true)
      rotation = await finishTrainsetRotation(connection, updatedTrip)
    }

    const live = await getLiveTrip(connection, tripId)
    return lowerKeys({ live, destinationReached: isDestination, rotation })
  })
}

export async function departFromStop(user, tripId, tripStopId) {
  return withTransaction(async (connection) => {
    const trip = await getTrip(connection, tripId, true)
    if (!trip) throw notFound('Trip not found')
    ensureAssignedOperator(trip, user)
    if (['COMPLETED','CANCELLED'].includes(trip.TRIP_STATUS)) throw badRequest(`Trip is ${trip.TRIP_STATUS.toLowerCase()}`)

    const stop = await getTripStopForUpdate(connection, tripId, tripStopId)
    if (!stop) throw notFound('Trip stop not found')
    if (!stop.SCHEDULED_DEPARTURE) throw badRequest('This is the destination stop; use Arrived instead of Departed')
    if (stop.ACTUAL_DEPARTURE) throw badRequest('Departure has already been marked')
    if (stop.SCHEDULED_ARRIVAL && !stop.ACTUAL_ARRIVAL) throw badRequest('Mark Arrived before Departed at this station')
    if (!(await previousStopCompleted(connection, tripId, stop.STOP_SEQUENCE))) {
      throw badRequest('Previous station must be departed before this departure can be marked')
    }

    await markDeparted(connection, { tripStopId, operatorId: user.userId })

    if (Number(stop.STOP_SEQUENCE) === 1) {
      await markTripStarted(connection, tripId)
      await activateCurrentTrainset(connection, trip)
    }

    const delay = await calculateStopDelay(connection, tripStopId)
    const updatedTrip = await getTrip(connection, tripId, true)
    const spare = await reserveSpareAfterDelay(connection, updatedTrip, delay)
    const live = await getLiveTrip(connection, tripId)

    return lowerKeys({ live, delayMinutes: delay, spare })
  })
}
