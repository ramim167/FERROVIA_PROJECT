import { withConnection, withTransaction } from '../config/database.js'
import {
  assignOperator,
  createTrip,
  getOperator,
  getRoute,
  getTrainsetForUpdate,
  listRoutes,
  listOperators,
  listAdminTrips,
  materializeTripSeats,
  materializeTripStops,
} from '../repositories/admin.repository.js'
import { createAssignment, listTrainsets, setTrainsetStatus } from '../repositories/trainset.repository.js'
import { getLiveTrip } from '../repositories/trip.repository.js'
import { badRequest, conflict, notFound } from '../utils/httpError.js'
import { lowerKeys } from '../utils/serializers.js'

async function validateOperator(connection, operatorUserId) {
  if (!operatorUserId) return
  const user = await getOperator(connection, Number(operatorUserId))
  if (!user) throw notFound('Operator user not found')
  if (!['OPERATOR', 'ADMIN'].includes(user.ROLE) || user.ACCOUNT_STATUS !== 'ACTIVE') {
    throw badRequest('Assigned user must be an active OPERATOR or ADMIN')
  }
}

export async function routes() {
  return withConnection(async (connection) => lowerKeys(await listRoutes(connection)))
}

export async function operators() {
  return withConnection(async (connection) => lowerKeys(await listOperators(connection)))
}

export async function trips(date) {
  return withConnection(async (connection) => lowerKeys(await listAdminTrips(connection, date || null)))
}

export async function trainsets(trainId) {
  return withConnection(async (connection) => lowerKeys(await listTrainsets(connection, trainId || null)))
}

export async function newTrip(payload) {
  const { routeId, scheduledDeparture, operatorUserId, trainsetId } = payload
  if (!routeId || !scheduledDeparture) throw badRequest('routeId and scheduledDeparture are required')
  const departure = new Date(scheduledDeparture)
  if (Number.isNaN(departure.getTime())) throw badRequest('scheduledDeparture must be a valid ISO date/time')

  return withTransaction(async (connection) => {
    const route = await getRoute(connection, Number(routeId))
    if (!route) throw notFound('Route not found')
    await validateOperator(connection, operatorUserId)

    const tripId = await createTrip(connection, {
      route,
      scheduledDeparture: departure,
      operatorUserId: operatorUserId ? Number(operatorUserId) : null,
    })
    await materializeTripStops(connection, tripId)
    await materializeTripSeats(connection, tripId)

    if (trainsetId) {
      const trainset = await getTrainsetForUpdate(connection, Number(trainsetId))
      if (!trainset) throw notFound('Trainset not found')
      if (Number(trainset.TRAIN_ID) !== Number(route.TRAIN_ID)) throw badRequest('Trainset belongs to a different train service')
      if (trainset.STATUS !== 'SPARE') throw conflict(`Trainset is currently ${trainset.STATUS}`)
      if (Number(trainset.CURRENT_STATION_ID) !== Number(route.SOURCE_STATION_ID)) {
        throw conflict('Trainset is not standing at this route source terminal')
      }

      await createAssignment(connection, {
        tripId,
        trainsetId: Number(trainsetId),
        trainId: route.TRAIN_ID,
        type: 'MANUAL',
        status: 'RESERVED',
        reason: 'Initial assignment by admin',
      })
      await setTrainsetStatus(connection, Number(trainsetId), 'RESERVED', route.SOURCE_STATION_ID)
    }

    return lowerKeys(await getLiveTrip(connection, tripId))
  })
}

export async function setOperator(tripId, operatorUserId) {
  return withTransaction(async (connection) => {
    await validateOperator(connection, operatorUserId)
    await assignOperator(connection, Number(tripId), Number(operatorUserId))
    return { tripId: Number(tripId), operatorUserId: Number(operatorUserId) }
  })
}
