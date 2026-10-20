import { Router } from 'express'

import { deleteComment } from '../controllers/comments.controller.js'
import { requireAuth } from '../middleware/require-auth.js'

const commentsRouter = Router()

commentsRouter.delete('/:commentId', requireAuth, deleteComment)

export default commentsRouter
