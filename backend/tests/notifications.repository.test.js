import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ createSupabaseUserClient: vi.fn() }))
vi.mock('../src/config/supabase.js', () => mocks)
import {
  findNotifications,
  countUnreadNotifications,
  markNotificationsRead,
} from '../src/repositories/notifications.repository.js'
let query
beforeEach(() => {
  vi.clearAllMocks()
  query = {}
  for (const method of [
    'from',
    'select',
    'eq',
    'lte',
    'is',
    'order',
    'range',
    'update',
  ])
    query[method] = vi.fn(() => query)
  query.then = (resolve) =>
    Promise.resolve({ data: [], count: 2, error: null }).then(resolve)
  mocks.createSupabaseUserClient.mockReturnValue(query)
})
it('reads only the authenticated recipient snapshot without private profile fields', async () => {
  expect(
    await findNotifications('member-token', 'recipient', {
      limit: 20,
      offset: 40,
      before: '2020-01-01T00:00:00Z',
    }),
  ).toEqual({ notifications: [], total: 2 })
  expect(mocks.createSupabaseUserClient).toHaveBeenCalledWith('member-token')
  expect(query.from).toHaveBeenCalledWith('notifications')
  expect(query.eq).toHaveBeenCalledWith('recipient_id', 'recipient')
  expect(query.lte).toHaveBeenCalledWith('created_at', '2020-01-01T00:00:00Z')
  expect(query.range).toHaveBeenCalledWith(40, 59)
  const selection = query.select.mock.calls[0][0]
  expect(selection).not.toMatch(/email|password|access_token|refresh_token/)
})
it('counts only unread notices with the user token', async () => {
  expect(await countUnreadNotifications('member-token', 'recipient')).toBe(2)
  expect(query.select).toHaveBeenCalledWith('id', {
    count: 'exact',
    head: true,
  })
  expect(query.eq).toHaveBeenCalledWith('recipient_id', 'recipient')
  expect(query.is).toHaveBeenCalledWith('read_at', null)
})
it('cannot broaden a single read update beyond the recipient and ID', async () => {
  await markNotificationsRead('member-token', 'recipient', { id: 'notice-id' })
  expect(Object.keys(query.update.mock.calls[0][0])).toEqual(['read_at'])
  expect(query.eq).toHaveBeenCalledWith('recipient_id', 'recipient')
  expect(query.eq).toHaveBeenCalledWith('id', 'notice-id')
  expect(query.is).toHaveBeenCalledWith('read_at', null)
  expect(query.lte).not.toHaveBeenCalled()
})
it('limits marking all read to notices already in the inbox snapshot', async () => {
  await markNotificationsRead('member-token', 'recipient', {
    before: '2020-01-01T00:00:00Z',
  })
  expect(query.eq).toHaveBeenCalledWith('recipient_id', 'recipient')
  expect(query.lte).toHaveBeenCalledWith('created_at', '2020-01-01T00:00:00Z')
})
