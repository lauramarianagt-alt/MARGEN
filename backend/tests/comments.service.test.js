import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  findCommentableArticleById: vi.fn(),
  findCommentById: vi.fn(),
  findPublicCommentsByArticleId: vi.fn(),
}))

vi.mock('../src/repositories/comments.repository.js', () => repositoryMocks)

import {
  addUserComment,
  listArticleComments,
  removeUserComment,
} from '../src/services/comments.service.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222'

const ARTICLE_ID = '33333333-3333-4333-8333-333333333333'

const COMMENT_ID = '44444444-4444-4444-8444-444444444444'

const PUBLISHED_ARTICLE = {
  id: ARTICLE_ID,
  author_id: OTHER_USER_ID,
  status: 'published',
  published_at: '2020-01-01T12:00:00.000Z',
}

const COMMENT = {
  id: COMMENT_ID,
  article_id: ARTICLE_ID,
  author_id: USER_ID,
  content: 'Una reflexión muy interesante.',
  created_at: '2026-10-20T16:00:00.000Z',
  updated_at: '2026-10-20T16:00:00.000Z',
  author: {
    id: USER_ID,
    username: 'lauragt2',
    name: 'Laura',
    surname: null,
    avatar_url: null,
  },
}

describe('Comments service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    repositoryMocks.findCommentableArticleById.mockResolvedValue(
      PUBLISHED_ARTICLE,
    )

    repositoryMocks.findPublicCommentsByArticleId.mockResolvedValue({
      comments: [],
      count: 0,
    })

    repositoryMocks.createComment.mockResolvedValue(COMMENT)

    repositoryMocks.findCommentById.mockResolvedValue(COMMENT)

    repositoryMocks.deleteComment.mockResolvedValue(COMMENT)
  })

  it('returns paginated public comments', async () => {
    repositoryMocks.findPublicCommentsByArticleId.mockResolvedValue({
      comments: [COMMENT],
      count: 21,
    })

    const result = await listArticleComments({
      articleId: ARTICLE_ID,
      page: 2,
      limit: 10,
    })

    expect(repositoryMocks.findPublicCommentsByArticleId).toHaveBeenCalledWith(
      ARTICLE_ID,
      {
        limit: 10,
        offset: 10,
      },
    )

    expect(result).toEqual({
      comments: [COMMENT],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    })
  })

  it('creates a comment on a published article from another author', async () => {
    const result = await addUserComment({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
      content: 'Una reflexión muy interesante.',
    })

    expect(repositoryMocks.findCommentableArticleById).toHaveBeenCalledWith(
      'token',
      ARTICLE_ID,
    )

    expect(repositoryMocks.createComment).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
      'Una reflexión muy interesante.',
    )

    expect(result).toEqual(COMMENT)
  })

  it('trims comment content before storing it', async () => {
    await addUserComment({
      accessToken: 'token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
      content: '   Comentario con espacios   ',
    })

    expect(repositoryMocks.createComment).toHaveBeenCalledWith(
      'token',
      USER_ID,
      ARTICLE_ID,
      'Comentario con espacios',
    )
  })

  it('rejects comment content that is not a string', async () => {
    await expect(
      addUserComment({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: null,
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 400,
      message: 'Comment content is required',
    })

    expect(repositoryMocks.createComment).not.toHaveBeenCalled()
  })

  it('rejects an empty comment after trimming whitespace', async () => {
    await expect(
      addUserComment({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: '     ',
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 400,
      message: 'Comment content is required',
    })

    expect(repositoryMocks.createComment).not.toHaveBeenCalled()
  })

  it('rejects comments longer than 2000 characters', async () => {
    await expect(
      addUserComment({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: 'a'.repeat(2001),
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 400,
      message: 'Comment content must be 2000 characters or fewer',
    })

    expect(repositoryMocks.createComment).not.toHaveBeenCalled()
  })

  it('rejects commenting on an own article', async () => {
    repositoryMocks.findCommentableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: USER_ID,
      status: 'published',
      published_at: '2020-01-01T12:00:00.000Z',
    })

    await expect(
      addUserComment({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: 'Comentario válido',
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 403,
      message: 'You cannot comment on your own article',
    })

    expect(repositoryMocks.createComment).not.toHaveBeenCalled()
  })

  it('rejects commenting on a draft article from another author', async () => {
    repositoryMocks.findCommentableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: OTHER_USER_ID,
      status: 'draft',
      published_at: null,
    })

    await expect(
      addUserComment({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: 'Comentario válido',
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 404,
      message: 'Article not found',
    })

    expect(repositoryMocks.createComment).not.toHaveBeenCalled()
  })

  it('rejects commenting on an article scheduled for the future', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-10-20T18:00:00.000Z'))

    repositoryMocks.findCommentableArticleById.mockResolvedValue({
      id: ARTICLE_ID,
      author_id: OTHER_USER_ID,
      status: 'published',
      published_at: '2026-10-21T18:00:00.000Z',
    })

    try {
      await expect(
        addUserComment({
          accessToken: 'token',
          userId: USER_ID,
          articleId: ARTICLE_ID,
          content: 'Comentario válido',
        }),
      ).rejects.toMatchObject({
        name: 'CommentServiceError',
        status: 404,
        message: 'Article not found',
      })

      expect(repositoryMocks.createComment).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects commenting when the article does not exist', async () => {
    repositoryMocks.findCommentableArticleById.mockResolvedValue(null)

    await expect(
      addUserComment({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: 'Comentario válido',
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 404,
      message: 'Article not found',
    })

    expect(repositoryMocks.createComment).not.toHaveBeenCalled()
  })

  it('deletes a comment owned by the authenticated user', async () => {
    const result = await removeUserComment({
      accessToken: 'token',
      userId: USER_ID,
      commentId: COMMENT_ID,
    })

    expect(repositoryMocks.findCommentById).toHaveBeenCalledWith(
      'token',
      COMMENT_ID,
    )

    expect(repositoryMocks.deleteComment).toHaveBeenCalledWith(
      'token',
      COMMENT_ID,
      USER_ID,
    )

    expect(result).toEqual(COMMENT)
  })

  it('rejects deleting a comment that does not exist', async () => {
    repositoryMocks.findCommentById.mockResolvedValue(null)

    await expect(
      removeUserComment({
        accessToken: 'token',
        userId: USER_ID,
        commentId: COMMENT_ID,
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 404,
      message: 'Comment not found',
    })

    expect(repositoryMocks.deleteComment).not.toHaveBeenCalled()
  })

  it('rejects deleting another user comment', async () => {
    repositoryMocks.findCommentById.mockResolvedValue({
      ...COMMENT,
      author_id: OTHER_USER_ID,
    })

    await expect(
      removeUserComment({
        accessToken: 'token',
        userId: USER_ID,
        commentId: COMMENT_ID,
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 403,
      message: 'You cannot delete this comment',
    })

    expect(repositoryMocks.deleteComment).not.toHaveBeenCalled()
  })

  it('returns not found when the comment disappears before deletion', async () => {
    repositoryMocks.deleteComment.mockResolvedValue(null)

    await expect(
      removeUserComment({
        accessToken: 'token',
        userId: USER_ID,
        commentId: COMMENT_ID,
      }),
    ).rejects.toMatchObject({
      name: 'CommentServiceError',
      status: 404,
      message: 'Comment not found',
    })
  })
})
