import { Router } from 'express'
import { assignOperator, createTrip, operators, routes, trainsets, trips } from '../controllers/admin.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))
router.get('/routes', asyncHandler(routes))
router.get('/operators', asyncHandler(operators))
router.get('/trips', asyncHandler(trips))
router.get('/trainsets', asyncHandler(trainsets))
router.post('/trips', asyncHandler(createTrip))
router.patch('/trips/:tripId/operator', asyncHandler(assignOperator))
export default router
