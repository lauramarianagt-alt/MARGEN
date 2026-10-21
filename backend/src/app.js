import { removeAccount } from './controllers/account.controller.js'
import { createRequestLimit } from './middleware/security.js'
import helmet from 'helmet'
import {
  apiErrorHandler,
  apiRequestLimit,
  requireSameOrigin,
} from './middleware/security.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { me } from './controllers/auth.controller.js'
import { requireAuth } from './middleware/require-auth.js'
import { articlesRouter, meArticlesRouter } from './routes/articles.routes.js'

import authRouter from './routes/auth.routes.js'
import { authorsRouter } from './routes/authors.routes.js'
import categoriesRouter from './routes/categories.routes.js'
import commentsRouter from './routes/comments.routes.js'
import favoritesRouter from './routes/favorites.routes.js'
import galleriesRouter from './routes/galleries.routes.js'
import followingRouter from './routes/following.routes.js'

import notificationsRouter from './routes/notifications.routes.js'

const app = express()
app.disable('x-powered-by')
// Only the local nginx hop is trusted; the API listens on loopback.
app.set('trust proxy', 'loopback')
app.use(
  helmet({
    xFrameOptions: { action: 'deny' },
    contentSecurityPolicy: { directives: { frameAncestors: ["'none'"] } },
  }),
)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use('/api', requireSameOrigin)
app.use('/api', apiRequestLimit)

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
)

app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'margen-api',
  })
})

app.use('/api', followingRouter)
app.use('/api', galleriesRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/auth', authRouter)
app.use('/api/articles', articlesRouter)
app.use('/api/authors', authorsRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/comments', commentsRouter)
app.use('/api/me/articles', meArticlesRouter)
app.use('/api/me/notifications', notificationsRouter)

app.get('/api/me', requireAuth, me)
app.delete(
  '/api/me/account',
  requireAuth,
  createRequestLimit({ limit: 5, keyGenerator: (req) => req.user.id }),
  removeAccount,
)

app.use(apiErrorHandler)

export default app
