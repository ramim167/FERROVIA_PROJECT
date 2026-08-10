import * as adminService from '../services/admin.service.js'

export async function routes(_req, res) {
  res.json({ success: true, data: await adminService.routes() })
}

export async function operators(_req, res) {
  res.json({ success: true, data: await adminService.operators() })
}

export async function trips(req, res) {
  res.json({ success: true, data: await adminService.trips(req.query.date || null) })
}

export async function trainsets(req, res) {
  const trainId = req.query.trainId ? Number(req.query.trainId) : null
  res.json({ success: true, data: await adminService.trainsets(trainId) })
}

export async function createTrip(req, res) {
  const data = await adminService.newTrip(req.body)
  res.status(201).json({ success: true, data })
}

export async function assignOperator(req, res) {
  const data = await adminService.setOperator(Number(req.params.tripId), Number(req.body.operatorUserId))
  res.json({ success: true, data })
}
