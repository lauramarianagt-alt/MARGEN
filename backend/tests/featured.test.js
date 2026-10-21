import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ findFeaturedArticles: vi.fn() }))
vi.mock('../src/repositories/featured.repository.js', () => mocks)
vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: {},
  supabaseAdmin: {},
  createSupabaseUserClient: vi.fn(),
}))
import app from '../src/app.js'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.findFeaturedArticles.mockResolvedValue({
    articles: [],
    mode: 'latest',
    timezone: 'Europe/Madrid',
    date: '2026-10-21',
  })
})
describe('Featured articles API', () => {
  it('returns the public ranking without requiring a session', async () => {
    const response = await request(app).get('/api/articles/featured')
    expect(response.status).toBe(200)
    expect(response.body.mode).toBe('latest')
    expect(mocks.findFeaturedArticles).toHaveBeenCalledWith(4)
  })
  it('accepts a bounded slide count', async () => {
    expect(
      (await request(app).get('/api/articles/featured?limit=6')).status,
    ).toBe(200)
    expect(mocks.findFeaturedArticles).toHaveBeenCalledWith(6)
  })
  it.each([
    'limit=0',
    'limit=7',
    'limit=1.5',
    'limit=no',
    'day=tomorrow',
    'author=private',
  ])('rejects invalid selection: %s', async (query) => {
    expect(
      (await request(app).get('/api/articles/featured?' + query)).status,
    ).toBe(400)
    expect(mocks.findFeaturedArticles).not.toHaveBeenCalled()
  })
  it('reports database failure without leaking its details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.findFeaturedArticles.mockRejectedValue(
      new Error('private database details'),
    )
    const response = await request(app).get('/api/articles/featured')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: 'Unable to load featured articles' })
    log.mockRestore()
  })
})
