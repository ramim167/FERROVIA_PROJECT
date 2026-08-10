import { Router } from 'express'
import { mine, readAll, readOne } from '../controllers/notification.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { asyncHandler } from '../utils/asyncHandler.js'
const router = Router()
router.use(requireAuth)
router.get('/', asyncHandler(mine))
router.patch('/read-all', asyncHandler(readAll))
router.patch('/:notificationId/read', asyncHandler(readOne))
export default router
