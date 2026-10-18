import { Router } from 'express'

import {
  createArticle,
  deleteArticle,
  getOwnArticle,
  getPublicArticle,
  listOwnArticles,
  listPublicArticles,
  updateArticle,
} from '../controllers/articles.controller.js'

import { requireAuth } from '../middleware/require-auth.js'

export const articlesRouter = Router()

export const meArticlesRouter = Router()

articlesRouter.get('/', listPublicArticles)

articlesRouter.get('/:username/:slug', getPublicArticle)

articlesRouter.post('/', requireAuth, createArticle)

articlesRouter.patch('/:id', requireAuth, updateArticle)

articlesRouter.delete('/:id', requireAuth, deleteArticle)

meArticlesRouter.get('/', requireAuth, listOwnArticles)

meArticlesRouter.get('/:id', requireAuth, getOwnArticle)
