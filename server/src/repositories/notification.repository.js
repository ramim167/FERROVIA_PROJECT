export async function listNotifications(connection, userId) {
  const result = await connection.execute(
    `SELECT NOTIFICATION_ID, BOOKING_ID, TRIP_ID, TITLE, MESSAGE, IS_READ, CREATED_AT
       FROM NOTIFICATIONS
      WHERE USER_ID = :userId
      ORDER BY CREATED_AT DESC
      FETCH FIRST 50 ROWS ONLY`,
    { userId }
  )
  return result.rows
}

export async function markNotificationRead(connection, userId, notificationId) {
  const result = await connection.execute(
    `UPDATE NOTIFICATIONS
        SET IS_READ = 1
      WHERE NOTIFICATION_ID = :notificationId
        AND USER_ID = :userId`,
    { notificationId, userId }
  )
  return result.rowsAffected > 0
}

export async function markAllNotificationsRead(connection, userId) {
  const result = await connection.execute(
    `UPDATE NOTIFICATIONS SET IS_READ = 1 WHERE USER_ID = :userId AND IS_READ = 0`,
    { userId }
  )
  return result.rowsAffected
}
