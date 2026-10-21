import express from 'express'
import request from 'supertest'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import {
  createRequestLimit,
  requireSameOrigin,
  apiErrorHandler,
} from '../src/middleware/security.js'
import { env } from '../src/config/env.js'
let app
beforeEach(() => {
  app = express()
  app.use(requireSameOrigin)
  app.use(express.json())
  app.post('/action', (req, res) => res.json({ ok: true }))
  app.use(apiErrorHandler)
})
afterEach(() => vi.restoreAllMocks())
it('rejects foreign and null origins before processing state changes', async () => {
  for (const origin of ['https://foreign.example', 'null'])
    expect(
      (await request(app).post('/action').set('Origin', origin).send({}))
        .status,
    ).toBe(403)
  expect(
    (
      await request(app)
        .post('/action')
        .set('Sec-Fetch-Site', 'cross-site')
        .send({})
    ).status,
  ).toBe(403)
})
it('allows the configured application origin and authenticated non-browser clients', async () => {
  expect(
    (
      await request(app)
        .post('/action')
        .set('Origin', new URL(env.frontendUrl).origin)
        .send({})
    ).status,
  ).toBe(200)
  expect((await request(app).post('/action').send({})).status).toBe(200)
})
it('limits repeated attempts and returns JSON with retry information', async () => {
  const limited = express()
  limited.use(createRequestLimit({ limit: 2, windowMs: 60000 }))
  limited.get('/', (req, res) => res.sendStatus(200))
  await request(limited).get('/')
  await request(limited).get('/')
  const response = await request(limited).get('/')
  expect(response.status).toBe(429)
  expect(response.headers['retry-after']).toBeTruthy()
  expect(response.body.error).toContain('Too many attempts')
})
it('returns generic JSON for malformed and oversized payloads', async () => {
  const malformed = await request(app)
    .post('/action')
    .set('Content-Type', 'application/json')
    .send('{invalid')
  expect(malformed.status).toBe(400)
  expect(malformed.body).toEqual({ error: 'Invalid JSON' })
  const large = await request(app)
    .post('/action')
    .send({ data: 'x'.repeat(110000) })
  expect(large.status).toBe(413)
  expect(large.text).not.toContain('stack')
})
