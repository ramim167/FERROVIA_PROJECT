import oracledb from 'oracledb'

const outNumber = () => ({ dir: oracledb.BIND_OUT, type: oracledb.NUMBER })

export async function listRoutes(connection) {
  const result = await connection.execute(
    `SELECT R.ROUTE_ID, R.ROUTE_CODE, R.DIRECTION, R.TRAIN_ID, T.TRAIN_NAME, T.TRAIN_CODE,
            R.SOURCE_STATION_ID, SRC.STATION_NAME AS SOURCE_STATION,
            R.DESTINATION_STATION_ID, DST.STATION_NAME AS DESTINATION_STATION,
            R.IS_ACTIVE
       FROM ROUTES R
       JOIN TRAINS T ON T.TRAIN_ID = R.TRAIN_ID
       JOIN STATIONS SRC ON SRC.STATION_ID = R.SOURCE_STATION_ID
       JOIN STATIONS DST ON DST.STATION_ID = R.DESTINATION_STATION_ID
      ORDER BY T.TRAIN_NAME, R.DIRECTION`
  )
  return result.rows
}

export async function getRoute(connection, routeId) {
  const result = await connection.execute(
    `SELECT R.ROUTE_ID, R.TRAIN_ID, R.DIRECTION, R.SOURCE_STATION_ID, R.DESTINATION_STATION_ID,
            MAX(GREATEST(NVL(RS.ARRIVAL_OFFSET_MIN,0), NVL(RS.DEPARTURE_OFFSET_MIN,0))) AS DURATION_MIN
       FROM ROUTES R
       JOIN ROUTE_STOPS RS ON RS.ROUTE_ID = R.ROUTE_ID
      WHERE R.ROUTE_ID = :routeId
      GROUP BY R.ROUTE_ID, R.TRAIN_ID, R.DIRECTION, R.SOURCE_STATION_ID, R.DESTINATION_STATION_ID`,
    { routeId }
  )
  return result.rows[0] || null
}

export async function createTrip(connection, { route, scheduledDeparture, operatorUserId }) {
  const result = await connection.execute(
    `INSERT INTO TRIPS
      (TRAIN_ID, ROUTE_ID, JOURNEY_DATE, SCHEDULED_DEPARTURE, SCHEDULED_ARRIVAL,
       TRIP_STATUS, OPERATOR_USER_ID)
     VALUES
      (:trainId, :routeId, TRUNC(:scheduledDeparture), :scheduledDeparture,
       :scheduledDeparture + NUMTODSINTERVAL(:durationMin, 'MINUTE'),
       'SCHEDULED', :operatorUserId)
     RETURNING TRIP_ID INTO :tripId`,
    {
      trainId: route.TRAIN_ID,
      routeId: route.ROUTE_ID,
      scheduledDeparture,
      durationMin: Number(route.DURATION_MIN),
      operatorUserId: operatorUserId || null,
      tripId: outNumber(),
    }
  )
  return result.outBinds.tripId[0]
}

export async function materializeTripStops(connection, tripId) {
  await connection.execute(
    `INSERT INTO TRIP_STOPS
      (TRIP_ID, ROUTE_STOP_ID, STATION_ID, STOP_SEQUENCE,
       SCHEDULED_ARRIVAL, SCHEDULED_DEPARTURE)
     SELECT T.TRIP_ID, RS.ROUTE_STOP_ID, RS.STATION_ID, RS.STOP_SEQUENCE,
            CASE WHEN RS.ARRIVAL_OFFSET_MIN IS NULL THEN NULL
                 ELSE T.SCHEDULED_DEPARTURE + NUMTODSINTERVAL(RS.ARRIVAL_OFFSET_MIN, 'MINUTE') END,
            CASE WHEN RS.DEPARTURE_OFFSET_MIN IS NULL THEN NULL
                 ELSE T.SCHEDULED_DEPARTURE + NUMTODSINTERVAL(RS.DEPARTURE_OFFSET_MIN, 'MINUTE') END
       FROM TRIPS T
       JOIN ROUTE_STOPS RS ON RS.ROUTE_ID = T.ROUTE_ID
      WHERE T.TRIP_ID = :tripId`,
    { tripId }
  )
}

export async function materializeTripSeats(connection, tripId) {
  await connection.execute(
    `INSERT INTO TRIP_SEATS (TRIP_ID, SEAT_ID, SEAT_STATUS)
     SELECT T.TRIP_ID, S.SEAT_ID, 'AVAILABLE'
       FROM TRIPS T
       JOIN COACHES C ON C.TRAIN_ID = T.TRAIN_ID
       JOIN SEATS S ON S.COACH_ID = C.COACH_ID
      WHERE T.TRIP_ID = :tripId
        AND S.IS_ACTIVE = 1`,
    { tripId }
  )
}

export async function getTrainsetForUpdate(connection, trainsetId) {
  const result = await connection.execute(
    `SELECT TRAINSET_ID, TRAIN_ID, TRAINSET_CODE, STATUS, CURRENT_STATION_ID
       FROM TRAINSETS
      WHERE TRAINSET_ID = :trainsetId
      FOR UPDATE`,
    { trainsetId }
  )
  return result.rows[0] || null
}

export async function assignOperator(connection, tripId, operatorUserId) {
  await connection.execute(
    `UPDATE TRIPS SET OPERATOR_USER_ID = :operatorUserId WHERE TRIP_ID = :tripId`,
    { tripId, operatorUserId }
  )
}

export async function getOperator(connection, userId) {
  const result = await connection.execute(
    `SELECT USER_ID, ROLE, ACCOUNT_STATUS FROM USERS WHERE USER_ID = :userId`,
    { userId }
  )
  return result.rows[0] || null
}


export async function listOperators(connection) {
  const result = await connection.execute(
    `SELECT USER_ID, FULL_NAME, EMAIL, PHONE, ROLE, ACCOUNT_STATUS
       FROM USERS
      WHERE ROLE IN ('OPERATOR','ADMIN')
        AND ACCOUNT_STATUS = 'ACTIVE'
      ORDER BY ROLE, FULL_NAME`
  )
  return result.rows
}

export async function listAdminTrips(connection, date = null) {
  const result = await connection.execute(
    `SELECT T.TRIP_ID, T.JOURNEY_DATE, T.SCHEDULED_DEPARTURE, T.SCHEDULED_ARRIVAL,
            T.TRIP_STATUS, T.OPERATOR_USER_ID,
            TR.TRAIN_ID, TR.TRAIN_NAME, TR.TRAIN_CODE,
            R.ROUTE_ID, R.ROUTE_CODE, R.DIRECTION,
            SRC.STATION_NAME AS SOURCE_STATION, DST.STATION_NAME AS DESTINATION_STATION,
            U.FULL_NAME AS OPERATOR_NAME,
            NVL(L.CURRENT_DELAY_MINUTES,0) AS CURRENT_DELAY_MINUTES,
            L.LAST_LEFT_STATION, L.NEXT_STATION
       FROM TRIPS T
       JOIN TRAINS TR ON TR.TRAIN_ID = T.TRAIN_ID
       JOIN ROUTES R ON R.ROUTE_ID = T.ROUTE_ID
       JOIN STATIONS SRC ON SRC.STATION_ID = R.SOURCE_STATION_ID
       JOIN STATIONS DST ON DST.STATION_ID = R.DESTINATION_STATION_ID
       LEFT JOIN USERS U ON U.USER_ID = T.OPERATOR_USER_ID
       LEFT JOIN VW_LIVE_TRAIN_STATUS L ON L.TRIP_ID = T.TRIP_ID
      WHERE (:journeyDate IS NULL OR TRUNC(T.JOURNEY_DATE) = TO_DATE(:journeyDate, 'YYYY-MM-DD'))
      ORDER BY T.SCHEDULED_DEPARTURE`,
    { journeyDate: date || null }
  )
  return result.rows
}
