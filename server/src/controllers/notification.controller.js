import * as notificationService from '../services/notification.service.js'

export async function mine(req, res) {
  res.json({ success: true, data: await notificationService.mine(req.user.userId) })
}
export async function readOne(req, res) {
  res.json({ success: true, data: await notificationService.readOne(req.user.userId, Number(req.params.notificationId)) })
}
export async function readAll(req, res) {
  res.json({ success: true, data: await notificationService.readAll(req.user.userId) })
}
