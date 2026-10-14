import { Router } from 'express'

import {
  confirm,
  login,
  logout,
  refresh,
  register,
} from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.post('/refresh', refresh)
router.get('/confirm', confirm)
export default router
