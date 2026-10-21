import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  createSupabaseUserClient: vi.fn(),
  signIn: vi.fn(),
  list: vi.fn(),
  remove: vi.fn(),
  deleteUser: vi.fn(),
}))
vi.mock('../src/config/supabase.js', () => ({
  createSupabaseUserClient: mocks.createSupabaseUserClient,
  supabaseAdmin: {
    storage: { from: () => ({ list: mocks.list, remove: mocks.remove }) },
    auth: { admin: { deleteUser: mocks.deleteUser } },
  },
}))
import { closeAccount } from '../src/services/account.service.js'
const input = {
  accessToken: 'session-token',
  user: { id: 'owner-id', email: 'owner@example.test' },
  password: 'CorrectPassword123!',
  confirmation: 'owner',
  acknowledged: true,
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.createSupabaseUserClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { username: 'owner' }, error: null }),
        }),
      }),
    }),
    auth: { signInWithPassword: mocks.signIn },
  })
  mocks.signIn.mockResolvedValue({
    data: { user: { id: 'owner-id' }, session: {} },
    error: null,
  })
  mocks.list.mockResolvedValue({
    data: [{ id: 'image-id', name: 'cover.webp' }],
    error: null,
  })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.deleteUser.mockResolvedValue({ error: null })
})
it('requires exact owner confirmation before password or deletion', async () => {
  await expect(
    closeAccount({ ...input, confirmation: 'other' }),
  ).rejects.toMatchObject({ status: 400 })
  expect(mocks.signIn).not.toHaveBeenCalled()
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('cannot delete with a wrong password or a reauthenticated identity mismatch', async () => {
  mocks.signIn.mockResolvedValueOnce({
    data: {},
    error: { message: 'Invalid' },
  })
  await expect(closeAccount(input)).rejects.toMatchObject({ status: 401 })
  mocks.signIn.mockResolvedValueOnce({
    data: { user: { id: 'someone-else' }, session: {} },
    error: null,
  })
  await expect(closeAccount(input)).rejects.toMatchObject({ status: 401 })
  expect(mocks.list).not.toHaveBeenCalled()
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('removes only session-owned images and the authenticated owner account', async () => {
  await closeAccount(input)
  expect(mocks.signIn).toHaveBeenCalledWith({
    email: input.user.email,
    password: input.password,
  })
  expect(mocks.list).toHaveBeenCalledWith(
    'owner-id',
    expect.objectContaining({ offset: 0 }),
  )
  expect(mocks.remove).toHaveBeenCalledWith(['owner-id/cover.webp'])
  expect(mocks.deleteUser).toHaveBeenCalledWith('owner-id')
})
it('stops if image cleanup fails, preserving the account for a retry', async () => {
  mocks.remove.mockResolvedValueOnce({
    error: new Error('Storage unavailable'),
  })
  await expect(closeAccount(input)).rejects.toThrow('Storage unavailable')
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('does not skip files when there is more than one storage page', async () => {
  mocks.list
    .mockResolvedValueOnce({
      data: Array.from({ length: 100 }, (_, i) => ({
        id: String(i),
        name: `file-${i}.webp`,
      })),
      error: null,
    })
    .mockResolvedValueOnce({
      data: [{ id: 'last', name: 'last.webp' }],
      error: null,
    })
  await closeAccount(input)
  expect(mocks.remove).toHaveBeenCalledTimes(2)
  expect(mocks.remove.mock.calls[0][0]).toHaveLength(100)
  expect(mocks.remove.mock.calls[1][0]).toEqual(['owner-id/last.webp'])
  expect(mocks.list.mock.calls[1][1].offset).toBe(100)
})
