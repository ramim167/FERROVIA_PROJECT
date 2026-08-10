export async function getTripSegment(connection, tripId, sourceStationId, destinationStationId) {
  const result = await connection.execute(
    `SELECT SRC.STOP_SEQUENCE AS SOURCE_SEQ,
            DST.STOP_SEQUENCE AS DEST_SEQ,
            RSRC.DISTANCE_FROM_SOURCE_KM AS SOURCE_DISTANCE_KM,
            RDST.DISTANCE_FROM_SOURCE_KM AS DEST_DISTANCE_KM,
            T.TRAIN_ID,
            T.ROUTE_ID
       FROM TRIP_STOPS SRC
       JOIN TRIP_STOPS DST ON DST.TRIP_ID = SRC.TRIP_ID
       JOIN ROUTE_STOPS RSRC ON RSRC.ROUTE_STOP_ID = SRC.ROUTE_STOP_ID
       JOIN ROUTE_STOPS RDST ON RDST.ROUTE_STOP_ID = DST.ROUTE_STOP_ID
       JOIN TRIPS T ON T.TRIP_ID = SRC.TRIP_ID
      WHERE SRC.TRIP_ID = :tripId
        AND SRC.STATION_ID = :sourceStationId
        AND DST.STATION_ID = :destinationStationId
        AND SRC.STOP_SEQUENCE < DST.STOP_SEQUENCE`,
    { tripId, sourceStationId, destinationStationId }
  )
  return result.rows[0] || null
}

export async function getFareRule(connection, trainId, classId) {
  const result = await connection.execute(
    `SELECT RATE_PER_KM, BASE_FARE
       FROM FARE_RULES
      WHERE TRAIN_ID = :trainId AND CLASS_ID = :classId`,
    { trainId, classId }
  )
  return result.rows[0] || null
}

export async function listAvailableSeats(connection, { tripId, sourceStationId, destinationStationId, classId }) {
  const segment = await getTripSegment(connection, tripId, sourceStationId, destinationStationId)
  if (!segment) return { segment: null, seats: [] }

  const result = await connection.execute(
    `SELECT TS.TRIP_SEAT_ID, S.SEAT_ID, S.SEAT_NUMBER, S.SEAT_TYPE,
            C.COACH_ID, C.COACH_CODE, CT.CLASS_ID, CT.CLASS_NAME, CT.CLASS_CODE,
            CASE WHEN EXISTS (
              SELECT 1
                FROM SEAT_RESERVATIONS SR
               WHERE SR.TRIP_SEAT_ID = TS.TRIP_SEAT_ID
                 AND SR.RESERVATION_STATUS IN ('BOOKED','HELD')
                 AND (SR.RESERVATION_STATUS <> 'HELD' OR SR.HOLD_EXPIRES_AT > SYSTIMESTAMP)
                 AND :sourceSeq < SR.DESTINATION_STOP_SEQUENCE
                 AND :destSeq > SR.SOURCE_STOP_SEQUENCE
            ) THEN 0 ELSE 1 END AS IS_AVAILABLE
       FROM TRIP_SEATS TS
       JOIN SEATS S ON S.SEAT_ID = TS.SEAT_ID
       JOIN COACHES C ON C.COACH_ID = S.COACH_ID
       JOIN CLASS_TYPES CT ON CT.CLASS_ID = C.CLASS_ID
      WHERE TS.TRIP_ID = :tripId
        AND TS.SEAT_STATUS = 'AVAILABLE'
        AND S.IS_ACTIVE = 1
        AND (:classId IS NULL OR CT.CLASS_ID = :classId)
      ORDER BY C.COACH_ORDER, S.SEAT_NUMBER`,
    {
      sourceSeq: segment.SOURCE_SEQ,
      destSeq: segment.DEST_SEQ,
      tripId,
      classId: classId || null,
    }
  )
  return { segment, seats: result.rows }
}

export async function lockTripSeat(connection, tripSeatId) {
  const result = await connection.execute(
    `SELECT TS.TRIP_SEAT_ID, TS.TRIP_ID, TS.SEAT_ID, TS.SEAT_STATUS,
            C.CLASS_ID, C.COACH_ID, C.COACH_CODE, S.SEAT_NUMBER
       FROM TRIP_SEATS TS
       JOIN SEATS S ON S.SEAT_ID = TS.SEAT_ID
       JOIN COACHES C ON C.COACH_ID = S.COACH_ID
      WHERE TS.TRIP_SEAT_ID = :tripSeatId
      FOR UPDATE`,
    { tripSeatId }
  )
  return result.rows[0] || null
}

export async function hasOverlap(connection, { tripSeatId, sourceSeq, destSeq }) {
  const result = await connection.execute(
    `SELECT COUNT(*) AS CNT
       FROM SEAT_RESERVATIONS
      WHERE TRIP_SEAT_ID = :tripSeatId
        AND RESERVATION_STATUS IN ('BOOKED','HELD')
        AND (RESERVATION_STATUS <> 'HELD' OR HOLD_EXPIRES_AT > SYSTIMESTAMP)
        AND :sourceSeq < DESTINATION_STOP_SEQUENCE
        AND :destSeq > SOURCE_STOP_SEQUENCE`,
    { tripSeatId, sourceSeq, destSeq }
  )
  return Number(result.rows[0].CNT) > 0
}
