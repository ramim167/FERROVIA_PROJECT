import { withConnection, withTransaction } from '../config/database.js'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../repositories/notification.repository.js'
import { notFound } from '../utils/httpError.js'
import { lowerKeys } from '../utils/serializers.js'

export async function mine(userId) {
  return withConnection(async (connection) => lowerKeys(await listNotifications(connection, userId)))
}

export async function readOne(userId, notificationId) {
  return withTransaction(async (connection) => {
    const changed = await markNotificationRead(connection, userId, notificationId)
    if (!changed) throw notFound('Notification not found')
    return { notificationId, isRead: true }
  })
}

export async function readAll(userId) {
  return withTransaction(async (connection) => ({ updated: await markAllNotificationsRead(connection, userId) }))
}
