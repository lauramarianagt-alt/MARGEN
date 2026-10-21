import { beforeEach, describe, it, expect, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  findPublicAuthorByUsername: vi.fn(),
  findFollowing: vi.fn(),
  saveFollowing: vi.fn(),
  deleteFollowing: vi.fn(),
  findPersonalizedArticles: vi.fn(),
}))
vi.mock('../src/repositories/authors.repository.js', () => mocks)
vi.mock('../src/repositories/following.repository.js', () => mocks)
import {
  getFollowing,
  setFollowing,
  getPersonalizedFeed,
} from '../src/services/following.service.js'
const input = { accessToken: 'token', userId: 'reader', username: 'writer' }
beforeEach(() => {
  vi.resetAllMocks()
  mocks.findPublicAuthorByUsername.mockResolvedValue({ id: 'author' })
  mocks.findFollowing.mockResolvedValue(null)
})
describe('Author following', () => {
  it('derives the target author from the public profile', async () => {
    await expect(getFollowing(input)).resolves.toEqual({ following: false })
    expect(mocks.findFollowing).toHaveBeenCalledWith(
      'token',
      'reader',
      'author',
    )
  })
  it('reports an existing relationship', async () => {
    mocks.findFollowing.mockResolvedValue({ author_id: 'author' })
    await expect(getFollowing(input)).resolves.toEqual({ following: true })
  })
  it('adds a relationship using the authenticated reader identity', async () => {
    await expect(setFollowing({ ...input, following: true })).resolves.toEqual({
      following: true,
    })
    expect(mocks.saveFollowing).toHaveBeenCalledWith(
      'token',
      'reader',
      'author',
    )
  })
  it('removes only the current reader relationship', async () => {
    await setFollowing({ ...input, following: false })
    expect(mocks.deleteFollowing).toHaveBeenCalledWith(
      'token',
      'reader',
      'author',
    )
  })
  it('rejects self-following', async () => {
    mocks.findPublicAuthorByUsername.mockResolvedValue({ id: 'reader' })
    await expect(
      setFollowing({ ...input, following: true }),
    ).rejects.toMatchObject({ status: 400 })
    expect(mocks.saveFollowing).not.toHaveBeenCalled()
  })
  it('returns not found for missing authors', async () => {
    mocks.findPublicAuthorByUsername.mockResolvedValue(null)
    await expect(
      setFollowing({ ...input, following: true }),
    ).rejects.toMatchObject({ status: 404 })
  })
  it('preserves the database ordering and accurate totals on empty later pages', async () => {
    mocks.findPersonalizedArticles.mockResolvedValue({
      articles: [],
      total: 12,
    })
    await expect(
      getPersonalizedFeed({
        accessToken: 'token',
        page: 3,
        limit: 10,
        search: 'style',
        category: 'design',
      }),
    ).resolves.toEqual({
      articles: [],
      pagination: { page: 3, limit: 10, total: 12, totalPages: 2 },
    })
    expect(mocks.findPersonalizedArticles).toHaveBeenCalledWith('token', {
      page: 3,
      limit: 10,
      search: 'style',
      category: 'design',
    })
  })
})
