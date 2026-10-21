import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  createProfile: vi.fn(),
  findProfileByUsername: vi.fn(),
  deleteUser: vi.fn(),
}))
vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: { auth: { signUp: mocks.signUp } },
  supabaseAdmin: { auth: { admin: { deleteUser: mocks.deleteUser } } },
}))
vi.mock('../src/repositories/profiles.repository.js', () => ({
  createProfile: mocks.createProfile,
  findProfileByUsername: mocks.findProfileByUsername,
  findProfileById: vi.fn(),
}))
import { registerUser } from '../src/services/auth.service.js'
const input = {
  email: 'reader@example.test',
  password: 'SamplePassword123!',
  username: 'reader',
  name: 'Reader',
  surname: 'Test',
  preferredLocale: 'es',
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.findProfileByUsername.mockResolvedValue(null)
  mocks.signUp.mockResolvedValue({
    data: { user: { id: 'existing-or-new-user' }, session: null },
    error: null,
  })
})
it('never deletes an authentication account when profile creation fails', async () => {
  mocks.createProfile.mockRejectedValueOnce(new Error('Profile already exists'))
  await expect(registerUser(input)).rejects.toThrow('Profile already exists')
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
it('keeps normal sign-up and email confirmation intact', async () => {
  mocks.createProfile.mockResolvedValueOnce({
    id: 'existing-or-new-user',
    username: 'reader',
  })
  expect(await registerUser(input)).toMatchObject({
    profile: { username: 'reader' },
    session: null,
  })
  expect(mocks.deleteUser).not.toHaveBeenCalled()
})
