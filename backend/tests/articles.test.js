import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const articleMocks = vi.hoisted(() => ({
  listPublicArticles: vi.fn(),
  listOwnArticles: vi.fn(),
  getOwnArticle: vi.fn(),
  createUserArticle: vi.fn(),
  updateUserArticle: vi.fn(),
  deleteUserArticle: vi.fn(),
}))

const authState = vi.hoisted(() => ({
  authenticated: true,
}))

vi.mock('../src/services/articles.service.js', () => {
  class ArticleServiceError extends Error {
    constructor(status, message) {
      super(message)

      this.name = 'ArticleServiceError'
      this.status = status
    }
  }

  return {
    ArticleServiceError,
    listPublicArticles: articleMocks.listPublicArticles,
    listOwnArticles: articleMocks.listOwnArticles,
    getOwnArticle: articleMocks.getOwnArticle,
    createUserArticle: articleMocks.createUserArticle,
    updateUserArticle: articleMocks.updateUserArticle,
    deleteUserArticle: articleMocks.deleteUserArticle,
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

const USER_ID = '11111111-1111-4111-8111-111111111111'

const ARTICLE_ID = '22222222-2222-4222-8222-222222222222'

const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
  'base64',
)

const ARTICLE = {
  id: ARTICLE_ID,
  author_id: USER_ID,
  title: 'Fashion deserves more than a feed',
  slug: 'fashion-deserves-more-than-a-feed',
  excerpt: 'Una reflexión sobre moda y cultura visual.',
  content: 'Contenido editorial de MARGEN.',
  cover_image_url: null,
  language: 'es',
  status: 'draft',
  published_at: null,
  article_categories: [],
}

describe('Articles API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    authState.authenticated = true
  })

  it('GET /api/articles returns public articles', async () => {
    articleMocks.listPublicArticles.mockResolvedValue({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const response = await request(app).get('/api/articles').expect(200)

    expect(response.body).toEqual({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    })
  })

  it('GET /api/articles supports pagination', async () => {
    articleMocks.listPublicArticles.mockResolvedValue({
      articles: [],
      pagination: {
        page: 2,
        limit: 5,
        total: 0,
        totalPages: 0,
      },
    })

    await request(app).get('/api/articles?page=2&limit=5').expect(200)

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
    })
  })

  it('GET /api/articles filters by author', async () => {
    articleMocks.listPublicArticles.mockResolvedValue({
      articles: [],
      pagination: {
        page: 2,
        limit: 5,
        total: 0,
        totalPages: 0,
      },
    })

    const response = await request(app).get('/api/articles').query({
      author: 'Lau',
      page: 2,
      limit: 5,
    })

    expect(response.status).toBe(200)

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      author: 'Lau',
      page: 2,
      limit: 5,
    })
  })

  it('GET /api/articles validates the author filter', async () => {
    const response = await request(app).get('/api/articles').query({
      author: 'ab',
    })

    expect(response.status).toBe(400)

    expect(articleMocks.listPublicArticles).not.toHaveBeenCalled()
  })

  it('GET /api/articles filters by category', async () => {
    articleMocks.listPublicArticles.mockResolvedValue({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const response = await request(app).get('/api/articles').query({
      category: 'visual-culture',
    })

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      category: 'visual-culture',
      page: 1,
      limit: 10,
    })
  })

  it('GET /api/articles validates the category filter', async () => {
    const response = await request(app).get('/api/articles').query({
      category: 'Visual Culture',
    })

    expect(response.status).toBe(400)

    expect(response.body.error).toBe('Invalid request data')

    expect(articleMocks.listPublicArticles).not.toHaveBeenCalled()
  })

  it('GET /api/articles filters by search term', async () => {
    articleMocks.listPublicArticles.mockResolvedValue({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const response = await request(app).get('/api/articles').query({
      search: 'fashion',
    })

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'fashion',
    })
  })

  it('GET /api/articles supports multi-word searches', async () => {
    articleMocks.listPublicArticles.mockResolvedValue({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const response = await request(app).get('/api/articles').query({
      search: 'visual culture',
    })

    expect(response.status).toBe(200)

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'visual culture',
    })
  })

  it('GET /api/articles validates the search filter', async () => {
    const response = await request(app).get('/api/articles').query({
      search: 'a',
    })

    expect(response.status).toBe(400)

    expect(response.body.error).toBe('Invalid request data')

    expect(articleMocks.listPublicArticles).not.toHaveBeenCalled()
  })

  it('GET /api/articles rejects an invalid page', async () => {
    const response = await request(app).get('/api/articles?page=0').expect(400)

    expect(response.body.error).toBe('Invalid request data')

    expect(articleMocks.listPublicArticles).not.toHaveBeenCalled()
  })

  it('GET /api/me/articles requires authentication', async () => {
    authState.authenticated = false

    await request(app).get('/api/me/articles').expect(401)

    expect(articleMocks.listOwnArticles).not.toHaveBeenCalled()
  })

  it('GET /api/me/articles returns the authenticated user articles', async () => {
    articleMocks.listOwnArticles.mockResolvedValue({
      articles: [ARTICLE],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })

    const response = await request(app).get('/api/me/articles').expect(200)

    expect(response.body.articles).toHaveLength(1)

    expect(articleMocks.listOwnArticles).toHaveBeenCalledWith({
      accessToken: 'test-access-token',
      userId: USER_ID,
      page: 1,
      limit: 10,
    })
  })

  it('GET /api/me/articles/:id returns an owned article', async () => {
    articleMocks.getOwnArticle.mockResolvedValue(ARTICLE)

    const response = await request(app)
      .get(`/api/me/articles/${ARTICLE_ID}`)
      .expect(200)

    expect(response.body).toEqual({
      article: ARTICLE,
    })

    expect(articleMocks.getOwnArticle).toHaveBeenCalledWith({
      accessToken: 'test-access-token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })
  })

  it('POST /api/articles requires authentication', async () => {
    authState.authenticated = false

    await request(app)
      .post('/api/articles')
      .send({
        title: 'New article',
      })
      .expect(401)

    expect(articleMocks.createUserArticle).not.toHaveBeenCalled()
  })

  it('POST /api/articles creates an article', async () => {
    articleMocks.createUserArticle.mockResolvedValue(ARTICLE)

    const response = await request(app)
      .post('/api/articles')
      .send({
        title: 'Fashion deserves more than a feed',
      })
      .expect(201)

    expect(response.body).toEqual({
      article: ARTICLE,
    })

    expect(articleMocks.createUserArticle).toHaveBeenCalledWith({
      accessToken: 'test-access-token',
      userId: USER_ID,
      input: {
        title: 'Fashion deserves more than a feed',
        content: '',
        language: 'es',
        status: 'draft',
        categoryIds: [],
      },
    })
  })

  it('POST /api/articles creates an article with a valid cover image', async () => {
    const articleWithCover = {
      ...ARTICLE,
      cover_image_url:
        'https://example.supabase.co/storage/v1/object/public/article-covers/cover.png',
    }

    articleMocks.createUserArticle.mockResolvedValue(articleWithCover)

    const response = await request(app)
      .post('/api/articles')
      .field(
        'article',
        JSON.stringify({
          title: 'Article with cover',
          categoryIds: [],
        }),
      )
      .attach('cover', VALID_PNG_BUFFER, {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .expect(201)

    expect(response.body).toEqual({
      article: articleWithCover,
    })

    expect(articleMocks.createUserArticle).toHaveBeenCalledTimes(1)

    const serviceInput = articleMocks.createUserArticle.mock.calls[0][0]

    expect(serviceInput).toMatchObject({
      accessToken: 'test-access-token',
      userId: USER_ID,
      input: {
        title: 'Article with cover',
        content: '',
        language: 'es',
        status: 'draft',
        categoryIds: [],
      },
    })

    expect(serviceInput.coverFile).toMatchObject({
      originalname: 'cover.png',
      detectedMimeType: 'image/png',
      detectedExtension: 'png',
      size: VALID_PNG_BUFFER.length,
    })

    expect(serviceInput.coverFile.buffer).toEqual(VALID_PNG_BUFFER)
  })

  it('POST /api/articles rejects a file that is not a supported image', async () => {
    const response = await request(app)
      .post('/api/articles')
      .field(
        'article',
        JSON.stringify({
          title: 'Invalid cover',
          categoryIds: [],
        }),
      )
      .attach('cover', Buffer.from('this is not a real image'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400)

    expect(response.body).toEqual({
      error: 'Cover image must be a JPEG, PNG, or WebP file.',
    })

    expect(articleMocks.createUserArticle).not.toHaveBeenCalled()
  })

  it('POST /api/articles rejects a cover image larger than 6 MB', async () => {
    const oversizedFile = Buffer.alloc(6 * 1024 * 1024 + 1)

    const response = await request(app)
      .post('/api/articles')
      .field(
        'article',
        JSON.stringify({
          title: 'Oversized cover',
          categoryIds: [],
        }),
      )
      .attach('cover', oversizedFile, {
        filename: 'too-large.png',
        contentType: 'image/png',
      })
      .expect(413)

    expect(response.body).toEqual({
      error: 'Cover image must be 6 MB or smaller.',
    })

    expect(articleMocks.createUserArticle).not.toHaveBeenCalled()
  })

  it('POST /api/articles validates article data', async () => {
    const response = await request(app)
      .post('/api/articles')
      .send({
        title: '',
      })
      .expect(400)

    expect(response.body.error).toBe('Invalid request data')

    expect(articleMocks.createUserArticle).not.toHaveBeenCalled()
  })

  it('PATCH /api/articles/:id updates an article', async () => {
    const publishedArticle = {
      ...ARTICLE,
      status: 'published',
      published_at: '2026-10-14T09:00:00.000Z',
    }

    articleMocks.updateUserArticle.mockResolvedValue(publishedArticle)

    const response = await request(app)
      .patch(`/api/articles/${ARTICLE_ID}`)
      .send({
        status: 'published',
      })
      .expect(200)

    expect(response.body).toEqual({
      article: publishedArticle,
    })

    expect(articleMocks.updateUserArticle).toHaveBeenCalledWith({
      accessToken: 'test-access-token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
      input: {
        status: 'published',
      },
    })
  })

  it('PATCH /api/articles/:id updates an article with a cover image', async () => {
    const articleWithCover = {
      ...ARTICLE,
      cover_image_url:
        'https://example.supabase.co/storage/v1/object/public/article-covers/cover.png',
    }

    articleMocks.updateUserArticle.mockResolvedValue(articleWithCover)

    const response = await request(app)
      .patch(`/api/articles/${ARTICLE_ID}`)
      .field(
        'article',
        JSON.stringify({
          title: 'Updated article',
        }),
      )
      .attach('cover', VALID_PNG_BUFFER, {
        filename: 'updated-cover.png',
        contentType: 'image/png',
      })
      .expect(200)

    expect(response.body).toEqual({
      article: articleWithCover,
    })

    expect(articleMocks.updateUserArticle).toHaveBeenCalledTimes(1)

    const serviceInput = articleMocks.updateUserArticle.mock.calls[0][0]

    expect(serviceInput).toMatchObject({
      accessToken: 'test-access-token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
      input: {
        title: 'Updated article',
      },
    })

    expect(serviceInput.coverFile).toMatchObject({
      originalname: 'updated-cover.png',
      detectedMimeType: 'image/png',
      detectedExtension: 'png',
      size: VALID_PNG_BUFFER.length,
    })

    expect(serviceInput.coverFile.buffer).toEqual(VALID_PNG_BUFFER)
  })

  it('PATCH /api/articles/:id validates the article id', async () => {
    await request(app)
      .patch('/api/articles/not-a-uuid')
      .send({
        status: 'published',
      })
      .expect(400)

    expect(articleMocks.updateUserArticle).not.toHaveBeenCalled()
  })

  it('DELETE /api/articles/:id deletes an owned article', async () => {
    articleMocks.deleteUserArticle.mockResolvedValue(undefined)

    const response = await request(app)
      .delete(`/api/articles/${ARTICLE_ID}`)
      .expect(204)

    expect(response.body).toEqual({})

    expect(articleMocks.deleteUserArticle).toHaveBeenCalledWith({
      accessToken: 'test-access-token',
      userId: USER_ID,
      articleId: ARTICLE_ID,
    })
  })
})
