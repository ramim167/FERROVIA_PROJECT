import { withConnection } from '../config/database.js'
import { getLiveStatusByTrainCode, getTrainServices, searchTrips } from '../repositories/train.repository.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { lowerKeys } from '../utils/serializers.js'

export async function index(_req, res) {
  const data = await withConnection(async (connection) => lowerKeys(await getTrainServices(connection)))
  res.json({ success: true, data })
}

export async function search(req, res) {
  const { from, to, date } = req.query
  if (!from || !to || !date) throw badRequest('from, to and date query parameters are required')
  const data = await withConnection(async (connection) => lowerKeys(await searchTrips(connection, { from, to, date })))
  res.json({ success: true, data })
}

export async function statusByCode(req, res) {
  const data = await withConnection(async (connection) => getLiveStatusByTrainCode(connection, req.params.trainCode))
  if (!data) throw notFound('No running or upcoming trip found for this train')
  res.json({ success: true, data: lowerKeys(data) })
}
