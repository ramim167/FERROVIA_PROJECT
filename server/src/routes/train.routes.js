import { Router } from 'express'
import { index, search, statusByCode } from '../controllers/train.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'
const router = Router()
router.get('/', asyncHandler(index))
router.get('/search', asyncHandler(search))
router.get('/:trainCode/status', asyncHandler(statusByCode))
export default router
