import oracledb from 'oracledb'

const outNumber = () => ({ dir: oracledb.BIND_OUT, type: oracledb.NUMBER })

export async function createBooking(connection, booking) {
  const result = await connection.execute(
    `INSERT INTO BOOKINGS
      (PNR_NUMBER, USER_ID, TRIP_ID, SOURCE_STATION_ID, DESTINATION_STATION_ID,
       CLASS_ID, TOTAL_FARE, BOOKING_STATUS)
     VALUES
      (:pnr, :userId, :tripId, :sourceStationId, :destinationStationId,
       :classId, :totalFare, 'PENDING')
     RETURNING BOOKING_ID INTO :bookingId`,
    { ...booking, bookingId: outNumber() }
  )
  return result.outBinds.bookingId[0]
}

export async function createPassenger(connection, bookingId, passenger) {
  const result = await connection.execute(
    `INSERT INTO PASSENGERS (BOOKING_ID, PASSENGER_NAME, AGE, GENDER)
     VALUES (:bookingId, :name, :age, :gender)
     RETURNING PASSENGER_ID INTO :passengerId`,
    { bookingId, ...passenger, passengerId: outNumber() }
  )
  return result.outBinds.passengerId[0]
}

export async function createHeldReservation(connection, data) {
  const result = await connection.execute(
    `INSERT INTO SEAT_RESERVATIONS
      (BOOKING_ID, PASSENGER_ID, TRIP_SEAT_ID, SOURCE_STATION_ID,
       DESTINATION_STATION_ID, SOURCE_STOP_SEQUENCE, DESTINATION_STOP_SEQUENCE,
       RESERVATION_STATUS, HELD_AT, HOLD_EXPIRES_AT)
     VALUES
      (:bookingId, :passengerId, :tripSeatId, :sourceStationId,
       :destinationStationId, :sourceSeq, :destSeq, 'HELD', SYSTIMESTAMP,
       SYSTIMESTAMP + NUMTODSINTERVAL(:holdMinutes, 'MINUTE'))
     RETURNING RESERVATION_ID INTO :reservationId`,
    { ...data, reservationId: outNumber() }
  )
  return result.outBinds.reservationId[0]
}

export async function createTicket(connection, { passengerId, reservationId, fare }) {
  const result = await connection.execute(
    `INSERT INTO TICKETS (PASSENGER_ID, RESERVATION_ID, TICKET_FARE, TICKET_STATUS)
     VALUES (:passengerId, :reservationId, :fare, 'CONFIRMED')
     RETURNING TICKET_ID INTO :ticketId`,
    { passengerId, reservationId, fare, ticketId: outNumber() }
  )
  return result.outBinds.ticketId[0]
}

export async function getBookingForUpdate(connection, pnr, userId) {
  const result = await connection.execute(
    `SELECT * FROM BOOKINGS
      WHERE PNR_NUMBER = :pnr AND USER_ID = :userId
      FOR UPDATE`,
    { pnr, userId }
  )
  return result.rows[0] || null
}

export async function getHeldReservations(connection, bookingId) {
  const result = await connection.execute(
    `SELECT SR.RESERVATION_ID, SR.PASSENGER_ID, SR.HOLD_EXPIRES_AT
       FROM SEAT_RESERVATIONS SR
      WHERE SR.BOOKING_ID = :bookingId
        AND SR.RESERVATION_STATUS = 'HELD'
      ORDER BY SR.RESERVATION_ID
      FOR UPDATE`,
    { bookingId }
  )
  return result.rows
}

export async function confirmBookingAndReservations(connection, bookingId) {
  await connection.execute(
    `UPDATE BOOKINGS
        SET BOOKING_STATUS = 'CONFIRMED'
      WHERE BOOKING_ID = :bookingId`,
    { bookingId }
  )
  await connection.execute(
    `UPDATE SEAT_RESERVATIONS
        SET RESERVATION_STATUS = 'BOOKED', BOOKED_AT = SYSTIMESTAMP
      WHERE BOOKING_ID = :bookingId AND RESERVATION_STATUS = 'HELD'`,
    { bookingId }
  )
}

export async function createPayment(connection, { bookingId, transactionId, amount, method, status }) {
  const result = await connection.execute(
    `INSERT INTO PAYMENTS
      (BOOKING_ID, TRANSACTION_ID, PAYMENT_AMOUNT, PAYMENT_METHOD, PAYMENT_STATUS)
     VALUES (:bookingId, :transactionId, :amount, :method, :status)
     RETURNING PAYMENT_ID INTO :paymentId`,
    { bookingId, transactionId, amount, method, status, paymentId: outNumber() }
  )
  return result.outBinds.paymentId[0]
}

export async function getBookingByPnr(connection, pnr, userId = null) {
  const result = await connection.execute(
    `SELECT B.BOOKING_ID, B.PNR_NUMBER, B.USER_ID, B.TRIP_ID, B.BOOKING_TIME,
            B.TOTAL_FARE, B.BOOKING_STATUS,
            TR.TRAIN_NAME, TR.TRAIN_CODE, R.DIRECTION,
            SRC.STATION_NAME AS SOURCE_STATION, DST.STATION_NAME AS DESTINATION_STATION,
            T.SCHEDULED_DEPARTURE, T.SCHEDULED_ARRIVAL, CT.CLASS_NAME
       FROM BOOKINGS B
       JOIN TRIPS T ON T.TRIP_ID = B.TRIP_ID
       JOIN TRAINS TR ON TR.TRAIN_ID = T.TRAIN_ID
       JOIN ROUTES R ON R.ROUTE_ID = T.ROUTE_ID
       JOIN STATIONS SRC ON SRC.STATION_ID = B.SOURCE_STATION_ID
       JOIN STATIONS DST ON DST.STATION_ID = B.DESTINATION_STATION_ID
       JOIN CLASS_TYPES CT ON CT.CLASS_ID = B.CLASS_ID
      WHERE B.PNR_NUMBER = :pnr
        AND (:userId IS NULL OR B.USER_ID = :userId)`,
    { pnr, userId }
  )
  const booking = result.rows[0]
  if (!booking) return null

  const passengers = await connection.execute(
    `SELECT P.PASSENGER_ID, P.PASSENGER_NAME, P.AGE, P.GENDER,
            C.COACH_CODE, S.SEAT_NUMBER, SR.RESERVATION_ID, SR.RESERVATION_STATUS,
            SR.HOLD_EXPIRES_AT, TK.TICKET_ID, TK.TICKET_STATUS, TK.TICKET_FARE,
            RF.REFUND_ID, RF.REFUND_AMOUNT, RF.REFUND_STATUS
       FROM PASSENGERS P
       LEFT JOIN SEAT_RESERVATIONS SR ON SR.PASSENGER_ID = P.PASSENGER_ID
       LEFT JOIN TRIP_SEATS TS ON TS.TRIP_SEAT_ID = SR.TRIP_SEAT_ID
       LEFT JOIN SEATS S ON S.SEAT_ID = TS.SEAT_ID
       LEFT JOIN COACHES C ON C.COACH_ID = S.COACH_ID
       LEFT JOIN TICKETS TK ON TK.PASSENGER_ID = P.PASSENGER_ID
       LEFT JOIN REFUNDS RF ON RF.TICKET_ID = TK.TICKET_ID
      WHERE P.BOOKING_ID = :bookingId
      ORDER BY P.PASSENGER_ID`,
    { bookingId: booking.BOOKING_ID }
  )

  booking.PASSENGERS = passengers.rows
  return booking
}

export async function listUserBookings(connection, userId) {
  const result = await connection.execute(
    `SELECT B.PNR_NUMBER, B.BOOKING_TIME, B.TOTAL_FARE, B.BOOKING_STATUS,
            TR.TRAIN_NAME, R.DIRECTION,
            SRC.STATION_NAME AS SOURCE_STATION, DST.STATION_NAME AS DESTINATION_STATION,
            T.SCHEDULED_DEPARTURE, T.SCHEDULED_ARRIVAL
       FROM BOOKINGS B
       JOIN TRIPS T ON T.TRIP_ID = B.TRIP_ID
       JOIN TRAINS TR ON TR.TRAIN_ID = T.TRAIN_ID
       JOIN ROUTES R ON R.ROUTE_ID = T.ROUTE_ID
       JOIN STATIONS SRC ON SRC.STATION_ID = B.SOURCE_STATION_ID
       JOIN STATIONS DST ON DST.STATION_ID = B.DESTINATION_STATION_ID
      WHERE B.USER_ID = :userId
      ORDER BY T.SCHEDULED_DEPARTURE DESC`,
    { userId }
  )
  return result.rows
}

export async function cancelBooking(connection, bookingId) {
  await connection.execute(
    `UPDATE BOOKINGS SET BOOKING_STATUS = 'CANCELLED'
      WHERE BOOKING_ID = :bookingId AND BOOKING_STATUS IN ('PENDING','CONFIRMED')`,
    { bookingId }
  )
  await connection.execute(
    `UPDATE SEAT_RESERVATIONS SET RESERVATION_STATUS = 'CANCELLED'
      WHERE BOOKING_ID = :bookingId AND RESERVATION_STATUS IN ('HELD','BOOKED')`,
    { bookingId }
  )
  await connection.execute(
    `UPDATE TICKETS SET TICKET_STATUS = 'CANCELLED'
      WHERE PASSENGER_ID IN (SELECT PASSENGER_ID FROM PASSENGERS WHERE BOOKING_ID = :bookingId)
        AND TICKET_STATUS = 'CONFIRMED'`,
    { bookingId }
  )
}


export async function createNotification(connection, { userId, bookingId = null, tripId = null, title, message }) {
  await connection.execute(
    `INSERT INTO NOTIFICATIONS (USER_ID, BOOKING_ID, TRIP_ID, TITLE, MESSAGE)
     VALUES (:userId, :bookingId, :tripId, :title, :message)`,
    { userId, bookingId, tripId, title, message }
  )
}

export async function createRefundRequests(connection, bookingId) {
  await connection.execute(
    `INSERT INTO REFUNDS (PAYMENT_ID, TICKET_ID, REFUND_AMOUNT, REFUND_STATUS)
     SELECT P.PAYMENT_ID,
            TK.TICKET_ID,
            ROUND(P.PAYMENT_AMOUNT / NULLIF(COUNT(*) OVER (), 0), 2),
            'REQUESTED'
       FROM PAYMENTS P
       JOIN PASSENGERS PS ON PS.BOOKING_ID = P.BOOKING_ID
       JOIN TICKETS TK ON TK.PASSENGER_ID = PS.PASSENGER_ID
      WHERE P.BOOKING_ID = :bookingId
        AND P.PAYMENT_STATUS = 'SUCCESSFUL'
        AND TK.TICKET_STATUS = 'CONFIRMED'
        AND NOT EXISTS (SELECT 1 FROM REFUNDS R WHERE R.TICKET_ID = TK.TICKET_ID)`,
    { bookingId }
  )
}
