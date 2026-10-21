import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  getFollowing: vi.fn(),
  setFollowing: vi.fn(),
  getPersonalizedFeed: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('../src/services/following.service.js', () => ({
  ...mocks,
  FollowingError: class extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: { auth: { getUser: mocks.getUser } },
  supabaseAdmin: {},
  createSupabaseUserClient: vi.fn(),
}))
import app from '../src/app.js'
const cookie = 'margen_access_token=test-token'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'reader' } },
    error: null,
  })
  mocks.getFollowing.mockResolvedValue({ following: false })
  mocks.setFollowing.mockResolvedValue({ following: true })
  mocks.getPersonalizedFeed.mockResolvedValue({
    articles: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  })
})
describe('Following API', () => {
  it.each(['get', 'post', 'delete'])(
    'requires authentication to %s follows',
    async (method) => {
      expect(
        (await request(app)[method]('/api/me/following/writer')).status,
      ).toBe(401)
    },
  )
  it('requires authentication for the personalized feed', async () => {
    expect((await request(app).get('/api/me/feed')).status).toBe(401)
  })
  it('uses the session identity instead of supplied ownership fields', async () => {
    expect(
      (
        await request(app)
          .post('/api/me/following/writer')
          .set('Cookie', cookie)
          .send({ userId: 'someone-else' })
      ).status,
    ).toBe(200)
    expect(mocks.setFollowing).toHaveBeenCalledWith({
      accessToken: 'test-token',
      userId: 'reader',
      username: 'writer',
      following: true,
    })
  })
  it('looks up the current follow state', async () => {
    expect(
      (await request(app).get('/api/me/following/writer').set('Cookie', cookie))
        .body,
    ).toEqual({ following: false })
  })
  it('passes deletion to the authenticated reader', async () => {
    await request(app).delete('/api/me/following/writer').set('Cookie', cookie)
    expect(mocks.setFollowing).toHaveBeenCalledWith({
      accessToken: 'test-token',
      userId: 'reader',
      username: 'writer',
      following: false,
    })
  })
  it.each([
    'page=0',
    'limit=51',
    'search=x',
    'category=INVALID',
    'author=someone',
  ])('rejects malformed feed parameters: %s', async (query) => {
    expect(
      (
        await request(app)
          .get('/api/me/feed?' + query)
          .set('Cookie', cookie)
      ).status,
    ).toBe(400)
    expect(mocks.getPersonalizedFeed).not.toHaveBeenCalled()
  })
  it('validates and passes paging and filters to the feed', async () => {
    const response = await request(app)
      .get('/api/me/feed?page=2&limit=5&search=style&category=design')
      .set('Cookie', cookie)
    expect(response.status).toBe(200)
    expect(mocks.getPersonalizedFeed).toHaveBeenCalledWith({
      accessToken: 'test-token',
      userId: 'reader',
      page: 2,
      limit: 5,
      search: 'style',
      category: 'design',
    })
  })
})
