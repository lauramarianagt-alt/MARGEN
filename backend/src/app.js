import express from 'express'

import categoriesRouter from './routes/categories.routes.js'

const app = express()

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'margen-api',
  })
})

app.use('/api/categories', categoriesRouter)

export default app