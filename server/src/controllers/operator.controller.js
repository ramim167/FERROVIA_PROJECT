import * as operatorService from '../services/operator.service.js'

export async function myTrips(req, res) {
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  const data = await operatorService.operatorTrips(req.user, date)
  res.json({ success: true, data })
}

export async function operations(req, res) {
  const data = await operatorService.tripOperations(req.user, Number(req.params.tripId))
  res.json({ success: true, data })
}

export async function arrive(req, res) {
  const data = await operatorService.arriveAtStop(
    req.user,
    Number(req.params.tripId),
    Number(req.params.tripStopId)
  )
  res.json({ success: true, data })
}

export async function depart(req, res) {
  const data = await operatorService.departFromStop(
    req.user,
    Number(req.params.tripId),
    Number(req.params.tripStopId)
  )
  res.json({ success: true, data })
}
