// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../src/i18n/index.js'
import i18n from '../src/i18n/index.js'
const mocks = vi.hoisted(() => ({
  getFollowing: vi.fn(),
  setFollowing: vi.fn(),
}))
const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
  user: { id: 'reader' },
}))
vi.mock('../src/hooks/useAuth.js', () => ({ useAuth: () => auth }))
vi.mock('../src/services/following.service.js', () => mocks)
import FollowAuthorButton from '../src/components/FollowAuthorButton.jsx'
const author = { id: 'writer', username: 'writer' }
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('es')
  auth.isAuthenticated = true
  auth.user = { id: 'reader' }
  mocks.getFollowing.mockResolvedValue({ following: false })
  mocks.setFollowing.mockImplementation(async (_, following) => ({ following }))
})
afterEach(cleanup)
function view(value = author) {
  return render(
    <MemoryRouter>
      <FollowAuthorButton author={value} />
    </MemoryRouter>,
  )
}
describe('Following authors from their profile', () => {
  it('follows and unfollows after the server confirms each change', async () => {
    view()
    const button = await screen.findByRole('button', { name: 'Seguir autora' })
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)
    await screen.findByRole('button', { name: 'Dejar de seguir' })
    expect(mocks.setFollowing).toHaveBeenCalledWith('writer', true)
    fireEvent.click(screen.getByRole('button', { name: 'Dejar de seguir' }))
    await screen.findByRole('button', { name: 'Seguir autora' })
    expect(mocks.setFollowing).toHaveBeenLastCalledWith('writer', false)
  })
  it('preserves the current state when following fails', async () => {
    mocks.setFollowing.mockRejectedValue(new Error('Unavailable'))
    view()
    const button = await screen.findByRole('button', { name: 'Seguir autora' })
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)
    await screen.findByRole('alert')
    expect(
      screen
        .getByRole('button', { name: 'Seguir autora' })
        .getAttribute('aria-pressed'),
    ).toBe('false')
  })
  it('links anonymous readers to login without requesting private data', () => {
    auth.isAuthenticated = false
    view()
    expect(
      screen.getByRole('link', { name: 'Seguir autora' }).getAttribute('href'),
    ).toBe('/login')
    expect(mocks.getFollowing).not.toHaveBeenCalled()
  })
  it('hides following on the reader own profile', () => {
    view({ id: 'reader', username: 'reader' })
    expect(screen.queryByRole('button')).toBeNull()
    expect(mocks.getFollowing).not.toHaveBeenCalled()
  })
  it('loads an existing follow after revisiting the profile', async () => {
    mocks.getFollowing.mockResolvedValue({ following: true })
    view()
    await screen.findByRole('button', { name: 'Dejar de seguir' })
  })
  it('retries a failed state lookup', async () => {
    mocks.getFollowing.mockRejectedValueOnce(new Error('Unavailable'))
    view()
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    await screen.findByRole('button', { name: 'Seguir autora' })
    expect(mocks.getFollowing).toHaveBeenCalledTimes(2)
  })
})
