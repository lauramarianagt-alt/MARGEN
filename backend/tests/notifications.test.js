import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  findNotifications: vi.fn(),
  countUnreadNotifications: vi.fn(),
  markNotificationsRead: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('../src/repositories/notifications.repository.js', () => mocks)
vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: { auth: { getUser: mocks.getUser } },
  supabaseAdmin: {},
  createSupabaseUserClient: vi.fn(),
}))
import app from '../src/app.js'
const cookie = 'margen_access_token=test-token'
const id = '11111111-1111-4111-8111-111111111111'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'reader' } },
    error: null,
  })
  mocks.findNotifications.mockResolvedValue({ notifications: [], total: 42 })
  mocks.countUnreadNotifications.mockResolvedValue(3)
  mocks.markNotificationsRead.mockResolvedValue(undefined)
})
describe('Notifications API', () => {
  it('rejects expired sessions before reading any private data', async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Expired session'),
    })
    const response = await request(app)
      .get('/api/me/notifications')
      .set('Cookie', cookie)
    expect(response.status).toBe(401)
    expect(mocks.findNotifications).not.toHaveBeenCalled()
    expect(mocks.countUnreadNotifications).not.toHaveBeenCalled()
  })

  it.each([
    ['get', ''],
    ['get', '/unread-count'],
    ['patch', '/read'],
    ['patch', `/${id}/read`],
  ])('requires authentication for %s %s', async (method, path) => {
    expect(
      (await request(app)[method]('/api/me/notifications' + path)).status,
    ).toBe(401)
    expect(mocks.findNotifications).not.toHaveBeenCalled()
  })
  it('paginates only the session inbox with a stable snapshot and no cache', async () => {
    const response = await request(app)
      .get('/api/me/notifications?page=2&limit=20')
      .set('Cookie', cookie)
    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toMatchObject({
      unreadCount: 3,
      pagination: { page: 2, limit: 20, total: 42, totalPages: 3 },
    })
    expect(mocks.findNotifications).toHaveBeenCalledWith(
      'test-token',
      'reader',
      { limit: 20, offset: 20, before: response.body.asOf },
    )
  })
  it.each([
    'page=0',
    'page=1.5',
    'limit=51',
    'recipient_id=someone',
    'unread=true',
  ])('rejects unsupported query %s', async (query) => {
    expect(
      (
        await request(app)
          .get('/api/me/notifications?' + query)
          .set('Cookie', cookie)
      ).status,
    ).toBe(400)
    expect(mocks.findNotifications).not.toHaveBeenCalled()
  })
  it('returns only the current recipient unread count', async () => {
    expect(
      (
        await request(app)
          .get('/api/me/notifications/unread-count')
          .set('Cookie', cookie)
      ).body,
    ).toEqual({ count: 3 })
    expect(mocks.countUnreadNotifications).toHaveBeenCalledWith(
      'test-token',
      'reader',
    )
  })
  it('marks a single notice only within the authenticated inbox', async () => {
    expect(
      (
        await request(app)
          .patch(`/api/me/notifications/${id}/read`)
          .set('Cookie', cookie)
          .send({ recipient_id: 'forged' })
      ).status,
    ).toBe(200)
    expect(mocks.markNotificationsRead).toHaveBeenCalledWith(
      'test-token',
      'reader',
      { id },
    )
  })
  it('rejects invalid IDs and bulk read bodies', async () => {
    expect(
      (
        await request(app)
          .patch('/api/me/notifications/invalid/read')
          .set('Cookie', cookie)
      ).status,
    ).toBe(400)
    expect(
      (
        await request(app)
          .patch('/api/me/notifications/read')
          .set('Cookie', cookie)
          .send({ before: 'bad', recipient_id: 'forged' })
      ).status,
    ).toBe(400)
    expect(mocks.markNotificationsRead).not.toHaveBeenCalled()
  })
  it('marks only events at or before the submitted inbox snapshot', async () => {
    const before = '2020-01-01T00:00:00.000Z'
    expect(
      (
        await request(app)
          .patch('/api/me/notifications/read')
          .set('Cookie', cookie)
          .send({ before })
      ).body,
    ).toEqual({ count: 3 })
    expect(mocks.markNotificationsRead).toHaveBeenCalledWith(
      'test-token',
      'reader',
      { before },
    )
  })
  it('caps a future cutoff to the server time', async () => {
    await request(app)
      .patch('/api/me/notifications/read')
      .set('Cookie', cookie)
      .send({ before: '2099-01-01T00:00:00Z' })
    expect(
      new Date(mocks.markNotificationsRead.mock.calls[0][2].before).getTime(),
    ).toBeLessThanOrEqual(Date.now())
  })
  it('returns a generic error without leaking database details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.findNotifications.mockRejectedValueOnce(
      new Error('private database error'),
    )
    const response = await request(app)
      .get('/api/me/notifications')
      .set('Cookie', cookie)
    expect(response.status).toBe(500)
    expect(response.body.error).not.toContain('private')
    vi.restoreAllMocks()
  })
})
