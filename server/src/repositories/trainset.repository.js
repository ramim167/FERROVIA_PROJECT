export async function getActiveAssignment(connection, tripId) {
  const result = await connection.execute(
    `SELECT A.ASSIGNMENT_ID, A.TRIP_ID, A.TRAINSET_ID, A.TRAIN_ID,
            A.ASSIGNMENT_TYPE, A.ASSIGNMENT_STATUS, TS.TRAINSET_CODE
       FROM TRAINSET_ASSIGNMENTS A
       JOIN TRAINSETS TS ON TS.TRAINSET_ID = A.TRAINSET_ID
      WHERE A.TRIP_ID = :tripId
        AND A.ASSIGNMENT_STATUS IN ('ACTIVE','RESERVED')
      ORDER BY CASE A.ASSIGNMENT_STATUS WHEN 'ACTIVE' THEN 1 ELSE 2 END,
               A.ASSIGNED_AT DESC
      FETCH FIRST 1 ROW ONLY`,
    { tripId }
  )
  return result.rows[0] || null
}

export async function activateAssignment(connection, assignmentId) {
  await connection.execute(
    `UPDATE TRAINSET_ASSIGNMENTS
        SET ASSIGNMENT_STATUS = 'ACTIVE', ACTIVATED_AT = NVL(ACTIVATED_AT, SYSTIMESTAMP)
      WHERE ASSIGNMENT_ID = :assignmentId`,
    { assignmentId }
  )
}

export async function completeAssignment(connection, assignmentId) {
  await connection.execute(
    `UPDATE TRAINSET_ASSIGNMENTS
        SET ASSIGNMENT_STATUS = 'COMPLETED', COMPLETED_AT = SYSTIMESTAMP
      WHERE ASSIGNMENT_ID = :assignmentId`,
    { assignmentId }
  )
}

export async function setTrainsetStatus(connection, trainsetId, status, stationId = null) {
  await connection.execute(
    `UPDATE TRAINSETS
        SET STATUS = :status,
            CURRENT_STATION_ID = :stationId,
            STATUS_UPDATED_AT = SYSTIMESTAMP
      WHERE TRAINSET_ID = :trainsetId`,
    { trainsetId, status, stationId }
  )
}

export async function findDestinationSpare(connection, trainId, stationId) {
  const result = await connection.execute(
    `SELECT TRAINSET_ID, TRAINSET_CODE
       FROM TRAINSETS
      WHERE TRAINSET_ID = (
            SELECT TRAINSET_ID
              FROM TRAINSETS
             WHERE TRAIN_ID = :trainId
               AND CURRENT_STATION_ID = :stationId
               AND STATUS = 'SPARE'
             ORDER BY TRAINSET_ID
             FETCH FIRST 1 ROW ONLY
      )
      FOR UPDATE SKIP LOCKED`,
    { trainId, stationId }
  )
  return result.rows[0] || null
}

export async function getReservedAssignmentForTrip(connection, tripId) {
  const result = await connection.execute(
    `SELECT ASSIGNMENT_ID, TRAINSET_ID, ASSIGNMENT_TYPE, ASSIGNMENT_STATUS
       FROM TRAINSET_ASSIGNMENTS
      WHERE TRIP_ID = :tripId
        AND ASSIGNMENT_STATUS = 'RESERVED'
      ORDER BY ASSIGNED_AT DESC
      FETCH FIRST 1 ROW ONLY`,
    { tripId }
  )
  return result.rows[0] || null
}

export async function cancelAssignment(connection, assignmentId, reason) {
  await connection.execute(
    `UPDATE TRAINSET_ASSIGNMENTS
        SET ASSIGNMENT_STATUS = 'CANCELLED',
            REASON = CASE WHEN REASON IS NULL THEN :reason ELSE REASON || '; ' || :reason END
      WHERE ASSIGNMENT_ID = :assignmentId`,
    { assignmentId, reason }
  )
}

export async function createAssignment(connection, { tripId, trainsetId, trainId, type, status = 'RESERVED', reason }) {
  await connection.execute(
    `INSERT INTO TRAINSET_ASSIGNMENTS
      (TRIP_ID, TRAINSET_ID, TRAIN_ID, ASSIGNMENT_TYPE, ASSIGNMENT_STATUS, REASON)
     VALUES
      (:tripId, :trainsetId, :trainId, :type, :status, :reason)`,
    { tripId, trainsetId, trainId, type, status, reason: reason || null }
  )
}

export async function listTrainsets(connection, trainId = null) {
  const sql = trainId
    ? `SELECT * FROM VW_TRAINSET_STATUS WHERE TRAIN_ID = :trainId ORDER BY TRAINSET_CODE`
    : `SELECT * FROM VW_TRAINSET_STATUS ORDER BY TRAIN_NAME, TRAINSET_CODE`
  const result = await connection.execute(sql, trainId ? { trainId } : {})
  return result.rows
}
