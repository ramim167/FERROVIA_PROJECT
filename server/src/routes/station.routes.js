import { Router } from 'express'
import { index } from '../controllers/station.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
const router = Router()
router.get('/', asyncHandler(index))
export default router
