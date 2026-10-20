import { Router } from 'express'

import {
  getPublicCategory,
  listCategories,
} from '../controllers/categories.controller.js'

const router = Router()

router.get('/', listCategories)

router.get('/:slug', getPublicCategory)

export default router
