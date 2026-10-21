import { createHash } from 'node:crypto'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { env } from '../config/env.js'

// CORS alone prevents reading responses, not cross-origin state changes.
export function requireSameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('Origin')
  if (
    (origin && origin !== new URL(env.frontendUrl).origin) ||
    req.get('Sec-Fetch-Site') === 'cross-site'
  ) {
    return res.status(403).json({ error: 'Cross-origin request rejected' })
  }
  return next()
}
export function createRequestLimit({
  limit,
  windowMs = 15 * 60 * 1000,
  ...options
}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please try again later.' },
    ...options,
  })
}
export const apiRequestLimit = createRequestLimit({
  limit: 600,
  windowMs: 5 * 60 * 1000,
})
export const registerRequestLimit = createRequestLimit({
  limit: 30,
  windowMs: 60 * 60 * 1000,
})
export const refreshRequestLimit = createRequestLimit({ limit: 120 })
export const loginRequestLimits = [
  createRequestLimit({ limit: 100, skipSuccessfulRequests: true }),
  createRequestLimit({
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const email =
        typeof req.body?.email === 'string'
          ? req.body.email.trim().toLowerCase()
          : ''
      const identity = createHash('sha256').update(email).digest('hex')
      return `${ipKeyGenerator(req.ip)}:${identity}`
    },
  }),
]
export function apiErrorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  if (error.type === 'entity.too.large')
    return res.status(413).json({ error: 'Request too large' })
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid JSON' })
  console.error('API request failed:', error)
  return res.status(500).json({ error: 'Unable to process request' })
}
