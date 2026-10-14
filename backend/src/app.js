import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import { env } from './config/env.js'
import { me } from './controllers/auth.controller.js'
import { requireAuth } from './middleware/require-auth.js'
import { articlesRouter, meArticlesRouter } from './routes/articles.routes.js'

import authRouter from './routes/auth.routes.js'
import categoriesRouter from './routes/categories.routes.js'

const app = express()

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

app.use('/api/categories', categoriesRouter)
app.use('/api/auth', authRouter)
app.use('/api/articles', articlesRouter)
app.use('/api/me/articles', meArticlesRouter)

app.get('/api/me', requireAuth, me)

export default app