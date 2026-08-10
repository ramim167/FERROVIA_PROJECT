import { Router } from 'express'
import { liveStatus, stops } from '../controllers/trip.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
const router = Router()
router.get('/:tripId/status', asyncHandler(liveStatus))
router.get('/:tripId/stops', asyncHandler(stops))
export default router
