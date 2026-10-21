import request from 'supertest'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), closeAccount: vi.fn() }))
vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: { auth: { getUser: mocks.getUser } },
  supabaseAdmin: {},
  createSupabaseUserClient: vi.fn(),
}))
vi.mock('../src/services/account.service.js', () => ({
  closeAccount: mocks.closeAccount,
  AccountError: class extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  },
}))
import app from '../src/app.js'
import { AccountError } from '../src/services/account.service.js'
const cookie = 'margen_access_token=test-token'
const input = {
  password: 'CorrectPassword123!',
  confirmation: 'owner',
  acknowledged: true,
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({
    data: { user: { id: 'owner-id', email: 'owner@example.test' } },
    error: null,
  })
  mocks.closeAccount.mockResolvedValue(undefined)
})
it('requires an authenticated session before account closure', async () => {
  expect(
    (await request(app).delete('/api/me/account').send(input)).status,
  ).toBe(401)
  expect(mocks.closeAccount).not.toHaveBeenCalled()
})
it('rejects missing explicit acknowledgement and forged account IDs', async () => {
  for (const body of [
    { password: input.password },
    { ...input, acknowledged: false },
    { ...input, userId: 'other-account' },
  ]) {
    expect(
      (
        await request(app)
          .delete('/api/me/account')
          .set('Cookie', cookie)
          .send(body)
      ).status,
    ).toBe(400)
  }
  expect(mocks.closeAccount).not.toHaveBeenCalled()
})
it('uses only the verified identity and clears cookies after successful closure', async () => {
  const response = await request(app)
    .delete('/api/me/account')
    .set('Cookie', cookie)
    .send(input)
  expect(response.status).toBe(204)
  expect(mocks.closeAccount).toHaveBeenCalledWith({
    accessToken: 'test-token',
    user: { id: 'owner-id', email: 'owner@example.test' },
    ...input,
  })
  expect(response.headers['set-cookie'].join(';')).toContain(
    'margen_access_token=;',
  )
})
it('retains the session and account on a password verification failure', async () => {
  mocks.closeAccount.mockRejectedValueOnce(
    new AccountError(401, 'Password verification failed'),
  )
  const response = await request(app)
    .delete('/api/me/account')
    .set('Cookie', cookie)
    .send(input)
  expect(response.status).toBe(401)
  expect(response.headers['set-cookie']).toBeUndefined()
})
