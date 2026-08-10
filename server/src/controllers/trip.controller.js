import { withConnection } from '../config/database.js'
import { getLiveTrip, getTripStops } from '../repositories/trip.repository.js'
import { notFound } from '../utils/httpError.js'
import { lowerKeys } from '../utils/serializers.js'

export async function liveStatus(req, res) {
  const tripId = Number(req.params.tripId)
  const data = await withConnection(async (connection) => getLiveTrip(connection, tripId))
  if (!data) throw notFound('Trip not found')
  res.json({ success: true, data: lowerKeys(data) })
}

export async function stops(req, res) {
  const tripId = Number(req.params.tripId)
  const data = await withConnection(async (connection) => getTripStops(connection, tripId))
  if (!data.length) throw notFound('Trip not found or trip stops have not been generated')
  res.json({ success: true, data: lowerKeys(data) })
}
