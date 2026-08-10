import { withConnection } from '../config/database.js'
import { listStations } from '../repositories/station.repository.js'
import { lowerKeys } from '../utils/serializers.js'

export async function index(_req, res) {
  const data = await withConnection(async (connection) => lowerKeys(await listStations(connection)))
  res.json({ success: true, data })
}
