import { Router } from 'express'
import { listFeaturedArticles } from '../controllers/featured.controller.js'

import {
  createArticle,
  deleteArticle,
  getOwnArticle,
  getPublicArticle,
  listOwnArticles,
  listPublicArticles,
  updateArticle,
} from '../controllers/articles.controller.js'

import {
  addArticleLike,
  deleteArticleLike,
  getArticleLike,
  getArticleLikes,
} from '../controllers/likes.controller.js'

import { addComment, listComments } from '../controllers/comments.controller.js'

import { requireAuth } from '../middleware/require-auth.js'
import { uploadArticleCover } from '../middleware/upload.middleware.js'

export const articlesRouter = Router()

export const meArticlesRouter = Router()

articlesRouter.get('/', listPublicArticles)
articlesRouter.get('/featured', listFeaturedArticles)

articlesRouter.get('/:id/likes', getArticleLikes)

articlesRouter.get('/:id/likes/me', requireAuth, getArticleLike)

articlesRouter.post('/:id/likes', requireAuth, addArticleLike)

articlesRouter.delete('/:id/likes', requireAuth, deleteArticleLike)

articlesRouter.get('/:id/comments', listComments)

articlesRouter.post('/:id/comments', requireAuth, addComment)

articlesRouter.get('/:username/:slug', getPublicArticle)

articlesRouter.post('/', requireAuth, uploadArticleCover, createArticle)

articlesRouter.patch('/:id', requireAuth, uploadArticleCover, updateArticle)

articlesRouter.delete('/:id', requireAuth, deleteArticle)

meArticlesRouter.get('/', requireAuth, listOwnArticles)

meArticlesRouter.get('/:id', requireAuth, getOwnArticle)
