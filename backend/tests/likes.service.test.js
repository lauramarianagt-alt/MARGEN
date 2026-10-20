import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  countArticleLikes: vi.fn(),
  createLike: vi.fn(),
  deleteLike: vi.fn(),
  findLikeableArticleById: vi.fn(),
  findLikeByArticleId: vi.fn(),
}))

vi.mock('../src/repositories/likes.repository.js', () => repositoryMocks)

import {
  addUserArticleLike,
  getArticleLikeCount,
  getUserArticleLike,
  removeUserArticleLike,
} from '../src/services/likes.service.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

const ARTICLE_ID = '33333333-3333-4333-8333-333333333333'

const LIKE = {
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

describe('Likes service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    repositoryMocks.findLikeableArticleById.mockResolvedValue(PUBLISHED_ARTICLE)

    repositoryMocks.findLikeByArticleId.mockResolvedValue(null)

    repositoryMocks.createLike.mockResolvedValue(LIKE)

    repositoryMocks.deleteLike.mockResolvedValue(LIKE)

    repositoryMocks.countArticleLikes.mockResolvedValue(0)
  })

  it('returns the public like count for an article', async () => {
    repositoryMocks.countArticleLikes.mockResolvedValue(12)

    const result = await getArticleLikeCount({
      articleId: ARTICLE_ID,
    })

    expect(repositoryMocks.countArticleLikes).toHaveBeenCalledWith(ARTICLE_ID)

    expect(result).toEqual({
      count: 12,
    })
  })

  it('returns false when the user has not liked the article', async () => {
    repositoryMocks.findLikeByArticleId.mockResolvedValue(null)

    const result = await getUserArticleLike({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(repositoryMocks.findLikeByArticleId).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
    )

    expect(result).toEqual({
      isLiked: false,
      like: null,
    })
  })

  it('returns true when the user has already liked the article', async () => {
    repositoryMocks.findLikeByArticleId.mockResolvedValue(LIKE)

    const result = await getUserArticleLike({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(result).toEqual({
      isLiked: true,
      like: LIKE,
    })
  })

  it('creates a like for a published article from another author', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-10-20T18:00:00.000Z'))

    repositoryMocks.countArticleLikes.mockResolvedValue(13)

    try {
      const result = await addUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })

      expect(repositoryMocks.createLike).toHaveBeenCalledWith(
        'token',
        USER_ID,
        ARTICLE_ID,
      )

      expect(repositoryMocks.countArticleLikes).toHaveBeenCalledWith(ARTICLE_ID)

      expect(result).toEqual({
        like: LIKE,
        count: 13,
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects liking an own article', async () => {
    repositoryMocks.findLikeableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: USER_ID,
      status: 'published',
      published_at: '2026-10-20T12:00:00.000Z',
    })

    await expect(
      addUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      name: 'LikeServiceError',
      status: 403,
      message: 'You cannot like your own article',
    })

    expect(repositoryMocks.findLikeByArticleId).not.toHaveBeenCalled()
    expect(repositoryMocks.createLike).not.toHaveBeenCalled()
  })

  it('rejects a draft article from another author', async () => {
    repositoryMocks.findLikeableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: OTHER_USER_ID,
      status: 'draft',
      published_at: null,
    })

    await expect(
      addUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      name: 'LikeServiceError',
      status: 404,
      message: 'Article not found',
    })

    expect(repositoryMocks.createLike).not.toHaveBeenCalled()
  })

  it('rejects an article scheduled for the future', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-10-20T18:00:00.000Z'))

    repositoryMocks.findLikeableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: OTHER_USER_ID,
      status: 'published',
      published_at: '2026-10-21T18:00:00.000Z',
    })

    try {
      await expect(
        addUserArticleLike({
          accessToken: 'token',
          userId: USER_ID,
          articleId: ARTICLE_ID,
        }),
      ).rejects.toMatchObject({
        name: 'LikeServiceError',
        status: 404,
        message: 'Article not found',
      })

      expect(repositoryMocks.createLike).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a duplicate like', async () => {
    repositoryMocks.findLikeByArticleId.mockResolvedValue(LIKE)

    await expect(
      addUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      name: 'LikeServiceError',
      status: 409,
      message: 'Article is already liked',
    })

    expect(repositoryMocks.createLike).not.toHaveBeenCalled()
  })

  it('converts a database unique constraint violation into a conflict', async () => {
    const databaseError = new Error('Unable to create article like')

    databaseError.cause = {
      code: '23505',
    }

    repositoryMocks.createLike.mockRejectedValue(databaseError)

    await expect(
      addUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      name: 'LikeServiceError',
      status: 409,
      message: 'Article is already liked',
    })
  })

  it('rejects removing a like that does not exist', async () => {
    repositoryMocks.findLikeByArticleId.mockResolvedValue(null)

    await expect(
      removeUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      name: 'LikeServiceError',
      status: 404,
      message: 'Like not found',
    })

    expect(repositoryMocks.deleteLike).not.toHaveBeenCalled()
    expect(repositoryMocks.countArticleLikes).not.toHaveBeenCalled()
  })

  it('removes an existing like and returns the updated count', async () => {
    repositoryMocks.findLikeByArticleId.mockResolvedValue(LIKE)

    repositoryMocks.countArticleLikes.mockResolvedValue(11)

    const result = await removeUserArticleLike({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })

    expect(repositoryMocks.deleteLike).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
    )

    expect(repositoryMocks.countArticleLikes).toHaveBeenCalledWith(ARTICLE_ID)

    expect(result).toEqual({
      like: LIKE,
      count: 11,
    })
  })

  it('returns not found when the like disappears before deletion', async () => {
    repositoryMocks.findLikeByArticleId.mockResolvedValue(LIKE)

    repositoryMocks.deleteLike.mockResolvedValue(null)

    await expect(
      removeUserArticleLike({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      }),
    ).rejects.toMatchObject({
      name: 'LikeServiceError',
      status: 404,
      message: 'Like not found',
    })

    expect(repositoryMocks.countArticleLikes).not.toHaveBeenCalled()
  })
})
