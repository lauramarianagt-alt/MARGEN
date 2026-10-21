import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import {
  followingState,
  followAuthor,
  unfollowAuthor,
  personalizedFeed,
} from '../controllers/following.controller.js'
const router = Router()
router.get('/me/feed', requireAuth, personalizedFeed)
router.get('/me/following/:username', requireAuth, followingState)
router.post('/me/following/:username', requireAuth, followAuthor)
router.delete('/me/following/:username', requireAuth, unfollowAuthor)
export default router
