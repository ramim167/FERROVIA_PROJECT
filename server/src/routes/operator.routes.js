import { Router } from 'express'
import { arrive, depart, myTrips, operations } from '../controllers/operator.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth, requireRole('OPERATOR', 'ADMIN'))
router.get('/trips', asyncHandler(myTrips))
router.get('/trips/:tripId', asyncHandler(operations))
router.post('/trips/:tripId/stops/:tripStopId/arrive', asyncHandler(arrive))
router.post('/trips/:tripId/stops/:tripStopId/depart', asyncHandler(depart))
export default router
