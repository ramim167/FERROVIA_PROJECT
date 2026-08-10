import { Router } from 'express'
import { cancelMine, classes, create, getMine, listMine, pay, seats } from '../controllers/booking.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()
router.get('/classes', asyncHandler(classes))
router.get('/seats', asyncHandler(seats))
router.use(requireAuth, requireRole('PASSENGER', 'OPERATOR', 'ADMIN'))
router.post('/', asyncHandler(create))
router.get('/mine', asyncHandler(listMine))
router.get('/:pnr', asyncHandler(getMine))
router.post('/:pnr/pay', asyncHandler(pay))
router.post('/:pnr/cancel', asyncHandler(cancelMine))
export default router
