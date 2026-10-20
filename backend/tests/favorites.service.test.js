import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  createFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
  findFavoriteableArticleById: vi.fn(),
  findFavoriteByArticleId: vi.fn(),
  findUserFavorites: vi.fn(),
}))

vi.mock('../src/repositories/favorites.repository.js', () => repositoryMocks)

import {
  addUserFavorite,
  getUserFavorite,
  listUserFavorites,
  removeUserFavorite,
} from '../src/services/favorites.service.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

const ARTICLE_ID = '33333333-3333-4333-8333-333333333333'

const FAVORITE = {
  user_id: USER_ID,
  article_id: ARTICLE_ID,
  created_at: '2026-10-20T16:00:00.000Z',
}

const PUBLISHED_ARTICLE = {
  id: ARTICLE_ID,
  author_id: OTHER_USER_ID,
  status: 'published',
  published_at: '2026-10-20T12:00:00.000Z',
}

describe('Favorites service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    repositoryMocks.findFavoriteableArticleById.mockResolvedValue(
      PUBLISHED_ARTICLE,
    )

    repositoryMocks.findFavoriteByArticleId.mockResolvedValue(null)

    repositoryMocks.createFavorite.mockResolvedValue(FAVORITE)

    repositoryMocks.deleteFavorite.mockResolvedValue(FAVORITE)

    repositoryMocks.findUserFavorites.mockResolvedValue({
      favorites: [],
      count: 0,
    })
  })

  it('returns paginated user favorites', async () => {
    repositoryMocks.findUserFavorites.mockResolvedValue({
      favorites: [FAVORITE],
      count: 21,
    })

    const result = await listUserFavorites({
      accessToken: 'token',
      userId: USER_ID,
      page: 2,
      limit: 10,
    })

    expect(repositoryMocks.findUserFavorites).toHaveBeenCalledWith(
      'token',
      USER_ID,
      {
        limit: 10,
        offset: 10,
      },
    )

    expect(result).toEqual({
      favorites: [FAVORITE],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    })
  })

  it('returns false when the article is not a favorite', async () => {
    repositoryMocks.findFavoriteByArticleId.mockResolvedValue(null)

    const result = await getUserFavorite({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(result).toEqual({
      isFavorite: false,
      favorite: null,
    })

    expect(repositoryMocks.findFavoriteByArticleId).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
    )
  })

  it('returns true when the article is already a favorite', async () => {
    repositoryMocks.findFavoriteByArticleId.mockResolvedValue(FAVORITE)

    const result = await getUserFavorite({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(result).toEqual({
      isFavorite: true,
      favorite: FAVORITE,
    })
  })

  it('allows favoriting an own draft article', async () => {
    repositoryMocks.findFavoriteableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: USER_ID,
      status: 'draft',
      published_at: null,
    })

    const result = await addUserFavorite({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(repositoryMocks.createFavorite).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
    )

    expect(result).toEqual(FAVORITE)
  })

  it('allows favoriting a published article from another author', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-10-20T18:00:00.000Z'))

    try {
      const result = await addUserFavorite({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })

      expect(repositoryMocks.createFavorite).toHaveBeenCalledWith(
        'token',
        USER_ID,
        ARTICLE_ID,
      )

      expect(result).toEqual(FAVORITE)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a private article belonging to another user', async () => {
    repositoryMocks.findFavoriteableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: OTHER_USER_ID,
      status: 'draft',
      published_at: null,
    })

    await expect(
      addUserFavorite({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Article not found',
    })

    expect(repositoryMocks.findFavoriteByArticleId).not.toHaveBeenCalled()
    expect(repositoryMocks.createFavorite).not.toHaveBeenCalled()
  })

  it('rejects an article scheduled for the future', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-10-20T18:00:00.000Z'))

    repositoryMocks.findFavoriteableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: OTHER_USER_ID,
      status: 'published',
      published_at: '2026-10-21T18:00:00.000Z',
    })

    try {
      await expect(
        addUserFavorite({
          accessToken: 'token',
          userId: USER_ID,
          articleId: ARTICLE_ID,
        }),
      ).rejects.toMatchObject({
        status: 404,
        message: 'Article not found',
      })

      expect(repositoryMocks.createFavorite).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a duplicate favorite', async () => {
    repositoryMocks.findFavoriteByArticleId.mockResolvedValue(FAVORITE)

    await expect(
      addUserFavorite({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Article is already a favorite',
    })

    expect(repositoryMocks.createFavorite).not.toHaveBeenCalled()
  })

  it('converts a database unique constraint violation into a conflict', async () => {
    const databaseError = new Error('Unable to create favorite')

    databaseError.cause = {
      code: '23505',
    }

    repositoryMocks.createFavorite.mockRejectedValue(databaseError)

    await expect(
      addUserFavorite({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Article is already a favorite',
    })
  })

  it('rejects removing a favorite that does not exist', async () => {
    repositoryMocks.findFavoriteByArticleId.mockResolvedValue(null)

    const promise = removeUserFavorite({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    await expect(promise).rejects.toMatchObject({
      name: 'FavoriteServiceError',
      status: 404,
      message: 'Favorite not found',
    })

    expect(repositoryMocks.deleteFavorite).not.toHaveBeenCalled()
  })

  it('removes an existing favorite', async () => {
    repositoryMocks.findFavoriteByArticleId.mockResolvedValue(FAVORITE)

    const result = await removeUserFavorite({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(repositoryMocks.deleteFavorite).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
    )

    expect(result).toEqual(FAVORITE)
  })
})
