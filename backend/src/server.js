import app from './app.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, process.env.HOST || '127.0.0.1', () => {
  console.log(`MARGEN API running on http://localhost:${PORT}`)
})
