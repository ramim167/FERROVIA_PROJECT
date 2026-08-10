export async function getLiveTrip(connection, tripId) {
  const result = await connection.execute(
    `SELECT * FROM VW_LIVE_TRAIN_STATUS WHERE TRIP_ID = :tripId`,
    { tripId }
  )
  return result.rows[0] || null
}

export async function getTrip(connection, tripId, forUpdate = false) {
  const result = await connection.execute(
    `SELECT T.*, R.DIRECTION, R.SOURCE_STATION_ID, R.DESTINATION_STATION_ID,
            TR.SPARE_TRIGGER_DELAY_MIN
       FROM TRIPS T
       JOIN ROUTES R ON R.ROUTE_ID = T.ROUTE_ID
       JOIN TRAINS TR ON TR.TRAIN_ID = T.TRAIN_ID
      WHERE T.TRIP_ID = :tripId${forUpdate ? ' FOR UPDATE' : ''}`,
    { tripId }
  )
  return result.rows[0] || null
}

export async function getTripStops(connection, tripId) {
  const result = await connection.execute(
    `SELECT TS.TRIP_STOP_ID, TS.TRIP_ID, TS.STATION_ID, S.STATION_NAME, S.STATION_CODE,
            TS.STOP_SEQUENCE, TS.SCHEDULED_ARRIVAL, TS.SCHEDULED_DEPARTURE,
            TS.ACTUAL_ARRIVAL, TS.ACTUAL_DEPARTURE, TS.STOP_STATUS
       FROM TRIP_STOPS TS
       JOIN STATIONS S ON S.STATION_ID = TS.STATION_ID
      WHERE TS.TRIP_ID = :tripId
      ORDER BY TS.STOP_SEQUENCE`,
    { tripId }
  )
  return result.rows
}

export async function getTripStopForUpdate(connection, tripId, tripStopId) {
  const result = await connection.execute(
    `SELECT * FROM TRIP_STOPS
      WHERE TRIP_ID = :tripId AND TRIP_STOP_ID = :tripStopId
      FOR UPDATE`,
    { tripId, tripStopId }
  )
  return result.rows[0] || null
}

export async function previousStopCompleted(connection, tripId, stopSequence) {
  if (Number(stopSequence) <= 1) return true
  const result = await connection.execute(
    `SELECT COUNT(*) AS CNT
       FROM TRIP_STOPS
      WHERE TRIP_ID = :tripId
        AND STOP_SEQUENCE = :previousSequence
        AND (ACTUAL_DEPARTURE IS NOT NULL OR STOP_STATUS = 'SKIPPED')`,
    { tripId, previousSequence: Number(stopSequence) - 1 }
  )
  return Number(result.rows[0].CNT) > 0
}

export async function markArrived(connection, { tripStopId, operatorId }) {
  await connection.execute(
    `UPDATE TRIP_STOPS
        SET ACTUAL_ARRIVAL = SYSTIMESTAMP,
            ARRIVAL_MARKED_BY = :operatorId,
            STOP_STATUS = 'ARRIVED'
      WHERE TRIP_STOP_ID = :tripStopId`,
    { tripStopId, operatorId }
  )
}

export async function markDeparted(connection, { tripStopId, operatorId }) {
  await connection.execute(
    `UPDATE TRIP_STOPS
        SET ACTUAL_DEPARTURE = SYSTIMESTAMP,
            DEPARTURE_MARKED_BY = :operatorId,
            STOP_STATUS = 'DEPARTED'
      WHERE TRIP_STOP_ID = :tripStopId`,
    { tripStopId, operatorId }
  )
}

export async function markTripStarted(connection, tripId) {
  await connection.execute(
    `UPDATE TRIPS
        SET ACTUAL_DEPARTURE = NVL(ACTUAL_DEPARTURE, SYSTIMESTAMP),
            TRIP_STATUS = 'RUNNING'
      WHERE TRIP_ID = :tripId`,
    { tripId }
  )
}

export async function markTripDelayed(connection, tripId) {
  await connection.execute(
    `UPDATE TRIPS
        SET TRIP_STATUS = CASE WHEN TRIP_STATUS = 'CANCELLED' THEN TRIP_STATUS ELSE 'DELAYED' END
      WHERE TRIP_ID = :tripId`,
    { tripId }
  )
}

export async function markSpareTriggered(connection, tripId) {
  await connection.execute(
    `UPDATE TRIPS
        SET SPARE_TRIGGERED_AT = NVL(SPARE_TRIGGERED_AT, SYSTIMESTAMP)
      WHERE TRIP_ID = :tripId`,
    { tripId }
  )
}

export async function completeTrip(connection, tripId) {
  await connection.execute(
    `UPDATE TRIPS
        SET ACTUAL_ARRIVAL = SYSTIMESTAMP,
            TRIP_STATUS = 'COMPLETED'
      WHERE TRIP_ID = :tripId`,
    { tripId }
  )
}

export async function findNextOppositeTrip(connection, trip) {
  const result = await connection.execute(
    `SELECT NEXT_T.TRIP_ID, NEXT_T.TRAIN_ID, NEXT_T.ROUTE_ID, NEXT_T.SCHEDULED_DEPARTURE,
            NEXT_R.SOURCE_STATION_ID, NEXT_R.DESTINATION_STATION_ID, NEXT_R.DIRECTION
       FROM TRIPS NEXT_T
       JOIN ROUTES NEXT_R ON NEXT_R.ROUTE_ID = NEXT_T.ROUTE_ID
      WHERE NEXT_T.TRAIN_ID = :trainId
        AND NEXT_R.DIRECTION <> :direction
        AND NEXT_R.SOURCE_STATION_ID = :destinationStationId
        AND NEXT_T.SCHEDULED_DEPARTURE > :currentScheduledDeparture
        AND NEXT_T.TRIP_STATUS IN ('SCHEDULED','BOARDING')
      ORDER BY NEXT_T.SCHEDULED_DEPARTURE
      FETCH FIRST 1 ROW ONLY`,
    {
      trainId: trip.TRAIN_ID,
      direction: trip.DIRECTION,
      destinationStationId: trip.DESTINATION_STATION_ID,
      currentScheduledDeparture: trip.SCHEDULED_DEPARTURE,
    }
  )
  return result.rows[0] || null
}

export async function listOperatorTrips(connection, operatorId, date, isAdmin = false) {
  const result = await connection.execute(
    `SELECT T.TRIP_ID, TR.TRAIN_NAME, TR.TRAIN_CODE, R.DIRECTION,
            SRC.STATION_NAME AS SOURCE_STATION, DST.STATION_NAME AS DESTINATION_STATION,
            T.SCHEDULED_DEPARTURE, T.SCHEDULED_ARRIVAL, T.TRIP_STATUS,
            NVL(L.CURRENT_DELAY_MINUTES,0) AS CURRENT_DELAY_MINUTES,
            L.LAST_LEFT_STATION, L.LAST_LEFT_AT, L.NEXT_STATION
       FROM TRIPS T
       JOIN TRAINS TR ON TR.TRAIN_ID = T.TRAIN_ID
       JOIN ROUTES R ON R.ROUTE_ID = T.ROUTE_ID
       JOIN STATIONS SRC ON SRC.STATION_ID = R.SOURCE_STATION_ID
       JOIN STATIONS DST ON DST.STATION_ID = R.DESTINATION_STATION_ID
       LEFT JOIN VW_LIVE_TRAIN_STATUS L ON L.TRIP_ID = T.TRIP_ID
      WHERE (:isAdmin = 1 OR T.OPERATOR_USER_ID = :operatorId)
        AND TRUNC(T.JOURNEY_DATE) = TO_DATE(:journeyDate, 'YYYY-MM-DD')
      ORDER BY T.SCHEDULED_DEPARTURE`,
    { operatorId, isAdmin: isAdmin ? 1 : 0, journeyDate: date }
  )
  return result.rows
}
