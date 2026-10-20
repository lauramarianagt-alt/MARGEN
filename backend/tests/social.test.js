import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const favoriteMocks = vi.hoisted(() => ({
  listUserFavorites: vi.fn(),
  getUserFavorite: vi.fn(),
  addUserFavorite: vi.fn(),
  removeUserFavorite: vi.fn(),
}))

const likeMocks = vi.hoisted(() => ({
  getArticleLikeCount: vi.fn(),
  getUserArticleLike: vi.fn(),
  addUserArticleLike: vi.fn(),
  removeUserArticleLike: vi.fn(),
}))

const commentMocks = vi.hoisted(() => ({
  listArticleComments: vi.fn(),
  addUserComment: vi.fn(),
  removeUserComment: vi.fn(),
}))

const authState = vi.hoisted(() => ({
  authenticated: true,
}))

vi.mock('../src/services/favorites.service.js', () => {
  class FavoriteServiceError extends Error {
    constructor(status, message) {
      super(message)

      this.name = 'FavoriteServiceError'
      this.status = status
    }
  }

  return {
    FavoriteServiceError,
    listUserFavorites: favoriteMocks.listUserFavorites,
    getUserFavorite: favoriteMocks.getUserFavorite,
    addUserFavorite: favoriteMocks.addUserFavorite,
    removeUserFavorite: favoriteMocks.removeUserFavorite,
  }
})

vi.mock('../src/services/likes.service.js', () => {
  class LikeServiceError extends Error {
    constructor(status, message) {
      super(message)

      this.name = 'LikeServiceError'
      this.status = status
    }
  }

  return {
    LikeServiceError,
    getArticleLikeCount: likeMocks.getArticleLikeCount,
    getUserArticleLike: likeMocks.getUserArticleLike,
    addUserArticleLike: likeMocks.addUserArticleLike,
    removeUserArticleLike: likeMocks.removeUserArticleLike,
  }
})

vi.mock('../src/services/comments.service.js', () => {
  class CommentServiceError extends Error {
    constructor(status, message) {
      super(message)

      this.name = 'CommentServiceError'
      this.status = status
    }
  }

  return {
    CommentServiceError,
    listArticleComments: commentMocks.listArticleComments,
    addUserComment: commentMocks.addUserComment,
    removeUserComment: commentMocks.removeUserComment,
  }
})

vi.mock('../src/middleware/require-auth.js', () => ({
  requireAuth(req, res, next) {
    if (!authState.authenticated) {
      return res.status(401).json({
        error: 'Authentication required',
      })
    }

    req.user = {
      id: '11111111-1111-4111-8111-111111111111',
    }

    req.accessToken = 'test-access-token'

    return next()
  },
}))

import app from '../src/app.js'

import { FavoriteServiceError } from '../src/services/favorites.service.js'
import { LikeServiceError } from '../src/services/likes.service.js'
import { CommentServiceError } from '../src/services/comments.service.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const ARTICLE_ID = '22222222-2222-4222-8222-222222222222'
const COMMENT_ID = '33333333-3333-4333-8333-333333333333'

const FAVORITE = {
  user_id: USER_ID,
  article_id: ARTICLE_ID,
  created_at: '2026-10-20T16:00:00.000Z',
}

const LIKE = {
  user_id: USER_ID,
  article_id: ARTICLE_ID,
  created_at: '2026-10-20T16:00:00.000Z',
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

describe('Social API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authState.authenticated = true
  })

  describe('Favorites', () => {
    it('GET /api/favorites requires authentication', async () => {
      authState.authenticated = false

      await request(app).get('/api/favorites').expect(401)

      expect(favoriteMocks.listUserFavorites).not.toHaveBeenCalled()
    })

    it('GET /api/favorites returns the authenticated user favorites', async () => {
      favoriteMocks.listUserFavorites.mockResolvedValue({
        favorites: [FAVORITE],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      })

      const response = await request(app).get('/api/favorites').expect(200)

      expect(response.body).toEqual({
        favorites: [FAVORITE],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      })

      expect(favoriteMocks.listUserFavorites).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        page: 1,
        limit: 10,
      })
    })

    it('GET /api/favorites/:id returns the favorite state', async () => {
      favoriteMocks.getUserFavorite.mockResolvedValue({
        isFavorite: true,
        favorite: FAVORITE,
      })

      const response = await request(app)
        .get(`/api/favorites/${ARTICLE_ID}`)
        .expect(200)

      expect(response.body).toEqual({
        isFavorite: true,
        favorite: FAVORITE,
      })

      expect(favoriteMocks.getUserFavorite).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })
    })

    it('POST /api/favorites/:id creates a favorite', async () => {
      favoriteMocks.addUserFavorite.mockResolvedValue(FAVORITE)

      const response = await request(app)
        .post(`/api/favorites/${ARTICLE_ID}`)
        .expect(201)

      expect(response.body).toEqual({
        favorite: FAVORITE,
      })

      expect(favoriteMocks.addUserFavorite).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })
    })

    it('POST /api/favorites/:id returns 409 for a duplicate favorite', async () => {
      favoriteMocks.addUserFavorite.mockRejectedValue(
        new FavoriteServiceError(409, 'Article is already a favorite'),
      )

      const response = await request(app)
        .post(`/api/favorites/${ARTICLE_ID}`)
        .expect(409)

      expect(response.body).toEqual({
        error: 'Article is already a favorite',
      })
    })

    it('DELETE /api/favorites/:id removes a favorite', async () => {
      favoriteMocks.removeUserFavorite.mockResolvedValue(FAVORITE)

      const response = await request(app)
        .delete(`/api/favorites/${ARTICLE_ID}`)
        .expect(204)

      expect(response.body).toEqual({})

      expect(favoriteMocks.removeUserFavorite).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })
    })
  })

  describe('Likes', () => {
    it('GET /api/articles/:id/likes is public', async () => {
      authState.authenticated = false

      likeMocks.getArticleLikeCount.mockResolvedValue({
        count: 12,
      })

      const response = await request(app)
        .get(`/api/articles/${ARTICLE_ID}/likes`)
        .expect(200)

      expect(response.body).toEqual({
        count: 12,
      })

      expect(likeMocks.getArticleLikeCount).toHaveBeenCalledWith({
        articleId: ARTICLE_ID,
      })
    })

    it('GET /api/articles/:id/likes/me requires authentication', async () => {
      authState.authenticated = false

      await request(app).get(`/api/articles/${ARTICLE_ID}/likes/me`).expect(401)

      expect(likeMocks.getUserArticleLike).not.toHaveBeenCalled()
    })

    it('GET /api/articles/:id/likes/me returns the current user like state', async () => {
      likeMocks.getUserArticleLike.mockResolvedValue({
        isLiked: true,
        like: LIKE,
      })

      const response = await request(app)
        .get(`/api/articles/${ARTICLE_ID}/likes/me`)
        .expect(200)

      expect(response.body).toEqual({
        isLiked: true,
        like: LIKE,
      })

      expect(likeMocks.getUserArticleLike).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })
    })

    it('POST /api/articles/:id/likes requires authentication', async () => {
      authState.authenticated = false

      await request(app).post(`/api/articles/${ARTICLE_ID}/likes`).expect(401)

      expect(likeMocks.addUserArticleLike).not.toHaveBeenCalled()
    })

    it('POST /api/articles/:id/likes creates a like', async () => {
      likeMocks.addUserArticleLike.mockResolvedValue({
        like: LIKE,
        count: 13,
      })

      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/likes`)
        .expect(201)

      expect(response.body).toEqual({
        like: LIKE,
        count: 13,
      })

      expect(likeMocks.addUserArticleLike).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })
    })

    it('POST /api/articles/:id/likes rejects likes on own articles', async () => {
      likeMocks.addUserArticleLike.mockRejectedValue(
        new LikeServiceError(403, 'You cannot like your own article'),
      )

      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/likes`)
        .expect(403)

      expect(response.body).toEqual({
        error: 'You cannot like your own article',
      })
    })

    it('POST /api/articles/:id/likes returns 409 for a duplicate like', async () => {
      likeMocks.addUserArticleLike.mockRejectedValue(
        new LikeServiceError(409, 'Article is already liked'),
      )

      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/likes`)
        .expect(409)

      expect(response.body).toEqual({
        error: 'Article is already liked',
      })
    })

    it('DELETE /api/articles/:id/likes removes a like and returns the new count', async () => {
      likeMocks.removeUserArticleLike.mockResolvedValue({
        like: LIKE,
        count: 11,
      })

      const response = await request(app)
        .delete(`/api/articles/${ARTICLE_ID}/likes`)
        .expect(200)

      expect(response.body).toEqual({
        like: LIKE,
        count: 11,
      })

      expect(likeMocks.removeUserArticleLike).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
      })
    })
  })

  describe('Comments', () => {
    it('GET /api/articles/:id/comments is public', async () => {
      authState.authenticated = false

      commentMocks.listArticleComments.mockResolvedValue({
        comments: [COMMENT],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      })

      const response = await request(app)
        .get(`/api/articles/${ARTICLE_ID}/comments`)
        .expect(200)

      expect(response.body).toEqual({
        comments: [COMMENT],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      })

      expect(commentMocks.listArticleComments).toHaveBeenCalledWith({
        articleId: ARTICLE_ID,
        page: 1,
        limit: 10,
      })
    })

    it('POST /api/articles/:id/comments requires authentication', async () => {
      authState.authenticated = false

      await request(app)
        .post(`/api/articles/${ARTICLE_ID}/comments`)
        .send({
          content: 'Comentario',
        })
        .expect(401)

      expect(commentMocks.addUserComment).not.toHaveBeenCalled()
    })

    it('POST /api/articles/:id/comments creates a comment', async () => {
      commentMocks.addUserComment.mockResolvedValue(COMMENT)

      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/comments`)
        .send({
          content: 'Una reflexión muy interesante.',
        })
        .expect(201)

      expect(response.body).toEqual({
        comment: COMMENT,
      })

      expect(commentMocks.addUserComment).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        content: 'Una reflexión muy interesante.',
      })
    })

    it('POST /api/articles/:id/comments rejects an empty comment', async () => {
      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/comments`)
        .send({
          content: '   ',
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid request data')

      expect(commentMocks.addUserComment).not.toHaveBeenCalled()
    })

    it('POST /api/articles/:id/comments rejects comments longer than 2000 characters', async () => {
      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/comments`)
        .send({
          content: 'a'.repeat(2001),
        })
        .expect(400)

      expect(response.body.error).toBe('Invalid request data')

      expect(commentMocks.addUserComment).not.toHaveBeenCalled()
    })

    it('POST /api/articles/:id/comments rejects comments on own articles', async () => {
      commentMocks.addUserComment.mockRejectedValue(
        new CommentServiceError(403, 'You cannot comment on your own article'),
      )

      const response = await request(app)
        .post(`/api/articles/${ARTICLE_ID}/comments`)
        .send({
          content: 'Comentario válido',
        })
        .expect(403)

      expect(response.body).toEqual({
        error: 'You cannot comment on your own article',
      })
    })

    it('DELETE /api/comments/:commentId deletes an owned comment', async () => {
      commentMocks.removeUserComment.mockResolvedValue(COMMENT)

      const response = await request(app)
        .delete(`/api/comments/${COMMENT_ID}`)
        .expect(204)

      expect(response.body).toEqual({})

      expect(commentMocks.removeUserComment).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        userId: USER_ID,
        commentId: COMMENT_ID,
      })
    })

    it('DELETE /api/comments/:commentId rejects deleting another user comment', async () => {
      commentMocks.removeUserComment.mockRejectedValue(
        new CommentServiceError(403, 'You cannot delete this comment'),
      )

      const response = await request(app)
        .delete(`/api/comments/${COMMENT_ID}`)
        .expect(403)

      expect(response.body).toEqual({
        error: 'You cannot delete this comment',
      })
    })
  })
})
