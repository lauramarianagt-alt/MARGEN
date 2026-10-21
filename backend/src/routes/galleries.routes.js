import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import { uploadGalleryFile } from '../middleware/gallery-upload.middleware.js'
import {
  ownGallery,
  articleGallery,
  createImage,
  changeImage,
  removeImage,
} from '../controllers/galleries.controller.js'
import { updateProfile } from '../controllers/profile.controller.js'
const router = Router()
router.get('/articles/:id/gallery', articleGallery)
router.get('/me/gallery', requireAuth, ownGallery)
router.post('/me/gallery', requireAuth, uploadGalleryFile, createImage)
router.patch('/me/gallery/:id', requireAuth, changeImage)
router.delete('/me/gallery/:id', requireAuth, removeImage)
router.patch('/me/profile', requireAuth, updateProfile)
export default router
