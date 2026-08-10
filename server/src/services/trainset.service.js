import {
  activateAssignment,
  cancelAssignment,
  completeAssignment,
  createAssignment,
  findDestinationSpare,
  getActiveAssignment,
  getReservedAssignmentForTrip,
  setTrainsetStatus,
} from '../repositories/trainset.repository.js'
import { findNextOppositeTrip, markSpareTriggered, markTripDelayed } from '../repositories/trip.repository.js'

export async function activateCurrentTrainset(connection, trip) {
  const assignment = await getActiveAssignment(connection, trip.TRIP_ID)
  if (!assignment) return null

  if (assignment.ASSIGNMENT_STATUS === 'RESERVED') {
    await activateAssignment(connection, assignment.ASSIGNMENT_ID)
    await setTrainsetStatus(connection, assignment.TRAINSET_ID, 'ACTIVE', null)
  }
  return assignment
}

export async function reserveSpareAfterDelay(connection, trip, delayMinutes) {
  if (delayMinutes < Number(trip.SPARE_TRIGGER_DELAY_MIN)) {
    return { triggered: false, reason: 'below_threshold' }
  }

  if (trip.SPARE_TRIGGERED_AT) {
    return { triggered: true, reason: 'already_triggered' }
  }

  const nextTrip = await findNextOppositeTrip(connection, trip)
  if (!nextTrip) {
    await markTripDelayed(connection, trip.TRIP_ID)
    return { triggered: false, reason: 'no_next_opposite_trip' }
  }

  const existing = await getReservedAssignmentForTrip(connection, nextTrip.TRIP_ID)
  if (existing?.ASSIGNMENT_TYPE === 'SPARE_REPLACEMENT') {
    await markSpareTriggered(connection, trip.TRIP_ID)
    await markTripDelayed(connection, trip.TRIP_ID)
    return { triggered: true, reason: 'replacement_already_reserved', nextTripId: nextTrip.TRIP_ID }
  }
  if (existing?.ASSIGNMENT_TYPE === 'MANUAL') {
    await markTripDelayed(connection, trip.TRIP_ID)
    return { triggered: false, reason: 'next_trip_manually_assigned', nextTripId: nextTrip.TRIP_ID }
  }

  const spare = await findDestinationSpare(connection, trip.TRAIN_ID, trip.DESTINATION_STATION_ID)
  if (!spare) {
    await markTripDelayed(connection, trip.TRIP_ID)
    return { triggered: false, reason: 'no_destination_spare', nextTripId: nextTrip.TRIP_ID }
  }

  if (existing) {
    await cancelAssignment(connection, existing.ASSIGNMENT_ID, 'Replaced because previous trip crossed delay threshold')
  }

  await createAssignment(connection, {
    tripId: nextTrip.TRIP_ID,
    trainsetId: spare.TRAINSET_ID,
    trainId: trip.TRAIN_ID,
    type: 'SPARE_REPLACEMENT',
    status: 'RESERVED',
    reason: `Previous trip ${trip.TRIP_ID} delay reached ${delayMinutes} minutes`,
  })
  await setTrainsetStatus(connection, spare.TRAINSET_ID, 'RESERVED', trip.DESTINATION_STATION_ID)
  await markSpareTriggered(connection, trip.TRIP_ID)
  await markTripDelayed(connection, trip.TRIP_ID)

  return {
    triggered: true,
    reason: 'destination_spare_reserved',
    nextTripId: nextTrip.TRIP_ID,
    trainsetId: spare.TRAINSET_ID,
    trainsetCode: spare.TRAINSET_CODE,
  }
}

export async function finishTrainsetRotation(connection, trip) {
  const current = await getActiveAssignment(connection, trip.TRIP_ID)
  if (!current) return { action: 'no_assignment' }

  await completeAssignment(connection, current.ASSIGNMENT_ID)

  if (trip.SPARE_TRIGGERED_AT) {
    await setTrainsetStatus(connection, current.TRAINSET_ID, 'SPARE', trip.DESTINATION_STATION_ID)
    return { action: 'delayed_train_became_spare', trainsetId: current.TRAINSET_ID }
  }

  const nextTrip = await findNextOppositeTrip(connection, trip)
  if (!nextTrip) {
    await setTrainsetStatus(connection, current.TRAINSET_ID, 'SPARE', trip.DESTINATION_STATION_ID)
    return { action: 'no_next_trip_train_became_spare', trainsetId: current.TRAINSET_ID }
  }

  const existing = await getReservedAssignmentForTrip(connection, nextTrip.TRIP_ID)
  if (existing) {
    await setTrainsetStatus(connection, current.TRAINSET_ID, 'SPARE', trip.DESTINATION_STATION_ID)
    return { action: 'next_trip_already_assigned', trainsetId: current.TRAINSET_ID, nextTripId: nextTrip.TRIP_ID }
  }

  await createAssignment(connection, {
    tripId: nextTrip.TRIP_ID,
    trainsetId: current.TRAINSET_ID,
    trainId: trip.TRAIN_ID,
    type: 'NORMAL',
    status: 'RESERVED',
    reason: `Normal UP/DOWN rotation after trip ${trip.TRIP_ID}`,
  })
  await setTrainsetStatus(connection, current.TRAINSET_ID, 'RESERVED', trip.DESTINATION_STATION_ID)

  return { action: 'same_train_reserved_for_next_trip', trainsetId: current.TRAINSET_ID, nextTripId: nextTrip.TRIP_ID }
}
