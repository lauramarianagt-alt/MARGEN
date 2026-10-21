import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import {
  list,
  unread,
  readOne,
  readAll,
} from '../controllers/notifications.controller.js'
const router = Router()
router.use(requireAuth)
router.get('/', list)
router.get('/unread-count', unread)
router.patch('/read', readAll)
router.patch('/:id/read', readOne)
export default router
