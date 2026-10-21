import { Router } from 'express'
import {
  loginRequestLimits,
  registerRequestLimit,
  refreshRequestLimit,
} from '../middleware/security.js'

import {
  confirm,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', registerRequestLimit, register)
router.post('/login', ...loginRequestLimits, login)
router.post('/logout', logout)
router.post('/refresh', refreshRequestLimit, refresh)
router.get('/confirm', refreshRequestLimit, confirm)
export default router
