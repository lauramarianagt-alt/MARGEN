import { Router } from 'express'

import { getPublicAuthor } from '../controllers/authors.controller.js'

export const authorsRouter = Router()

authorsRouter.get('/:username', getPublicAuthor)
