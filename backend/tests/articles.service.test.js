import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  addArticleCategories: vi.fn(),
  createArticle: vi.fn(),
  deleteArticleById: vi.fn(),
  findArticleBySlug: vi.fn(),
  findCategoriesByIds: vi.fn(),
  findOwnedArticleById: vi.fn(),
  findOwnArticles: vi.fn(),
  findPublicArticles: vi.fn(),
  getArticleCategoryIds: vi.fn(),
  removeArticleCategories: vi.fn(),
  updateArticleById: vi.fn(),
}))

vi.mock('../src/repositories/articles.repository.js', () => repositoryMocks)

vi.mock('../src/repositories/authors.repository.js', () => ({
  findPublicAuthorByUsername: vi.fn(),
}))

vi.mock('../src/repositories/categories.repository.js', () => ({
  findCategoryBySlug: vi.fn(),
}))

import { findPublicAuthorByUsername } from '../src/repositories/authors.repository.js'
import { findCategoryBySlug } from '../src/repositories/categories.repository.js'
import {
  ArticleServiceError,
  createUserArticle,
  listPublicArticles,
  updateUserArticle,
} from '../src/services/articles.service.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const ARTICLE_ID = '22222222-2222-4222-8222-222222222222'

const CATEGORY_ID = '33333333-3333-4333-8333-333333333333'

const SECOND_CATEGORY_ID = '44444444-4444-4444-8444-444444444444'

const STORED_ARTICLE = {
  id: ARTICLE_ID,
  author_id: USER_ID,
  title: 'MARGEN article',
  slug: 'margen-article',
  excerpt: null,
  content: '',
  language: 'es',
  status: 'draft',
  published_at: null,
  article_categories: [],
}

describe('Articles service', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    repositoryMocks.findArticleBySlug.mockResolvedValue(null)

    repositoryMocks.createArticle.mockResolvedValue({
      id: ARTICLE_ID,
    })

    repositoryMocks.addArticleCategories.mockResolvedValue([])

    repositoryMocks.findOwnedArticleById.mockResolvedValue(STORED_ARTICLE)

    repositoryMocks.findCategoriesByIds.mockResolvedValue([])
  })

  it('creates a draft with no publication date', async () => {
    await createUserArticle({
      accessToken: 'token',
      userId: USER_ID,
      input: {
        title: 'Árbitro & Moda',
        content: '',
        language: 'es',
        status: 'draft',
        categoryIds: [],
      },
    })

    expect(repositoryMocks.createArticle).toHaveBeenCalledWith('token', {
      author_id: USER_ID,
      title: 'Árbitro & Moda',
      slug: 'arbitro-moda',
      excerpt: null,
      content: '',
      language: 'es',
      status: 'draft',
      published_at: null,
    })
  })

  it('filters public articles by author username', async () => {
    findPublicAuthorByUsername.mockResolvedValue({
      id: 'author-1',
      username: 'Lau',
    })

    repositoryMocks.findPublicArticles.mockResolvedValue({
      articles: [
        {
          id: 'article-1',
          title: 'Fashion deserves more than a feed',
        },
      ],
      count: 1,
    })

    const result = await listPublicArticles({
      page: 1,
      limit: 10,
      author: 'Lau',
    })

    expect(findPublicAuthorByUsername).toHaveBeenCalledWith('Lau')

    expect(repositoryMocks.findPublicArticles).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      authorId: 'author-1',
      categoryId: null,
    })

    expect(result).toEqual({
      articles: [
        {
          id: 'article-1',
          title: 'Fashion deserves more than a feed',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })
  })

  it('returns an empty public list when the author does not exist', async () => {
    findPublicAuthorByUsername.mockResolvedValue(null)

    const result = await listPublicArticles({
      page: 1,
      limit: 10,
      author: 'unknown-user',
    })

    expect(findPublicAuthorByUsername).toHaveBeenCalledWith('unknown-user')

    expect(repositoryMocks.findPublicArticles).not.toHaveBeenCalled()

    expect(result).toEqual({
      articles: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    })
  })

  it('filters public articles by category slug', async () => {
    findCategoryBySlug.mockResolvedValue({
      id: CATEGORY_ID,
      name: 'Visual Culture',
      slug: 'visual-culture',
    })

    repositoryMocks.findPublicArticles.mockResolvedValue({
      articles: [
        {
          id: 'article-1',
          title: 'Fashion deserves more than a feed',
        },
      ],
      count: 1,
    })

    const result = await listPublicArticles({
      page: 1,
      limit: 10,
      category: 'visual-culture',
    })

    expect(findCategoryBySlug).toHaveBeenCalledWith('visual-culture')

    expect(repositoryMocks.findPublicArticles).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      authorId: null,
      categoryId: CATEGORY_ID,
    })

    expect(result).toEqual({
      articles: [
        {
          id: 'article-1',
          title: 'Fashion deserves more than a feed',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    })
  })

  it('returns an empty public list when the category does not exist', async () => {
    findCategoryBySlug.mockResolvedValue(null)

    const result = await listPublicArticles({
      page: 1,
      limit: 10,
      category: 'unknown-category',
    })

    expect(findCategoryBySlug).toHaveBeenCalledWith('unknown-category')

    expect(repositoryMocks.findPublicArticles).not.toHaveBeenCalled()

    expect(result).toEqual({
      articles: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    })
  })

  it('combines author and category filters for public articles', async () => {
    findPublicAuthorByUsername.mockResolvedValue({
      id: 'author-1',
      username: 'Lau',
    })

    findCategoryBySlug.mockResolvedValue({
      id: CATEGORY_ID,
      name: 'Visual Culture',
      slug: 'visual-culture',
    })

    repositoryMocks.findPublicArticles.mockResolvedValue({
      articles: [],
      count: 0,
    })

    const result = await listPublicArticles({
      page: 1,
      limit: 10,
      author: 'Lau',
      category: 'visual-culture',
    })

    expect(findPublicAuthorByUsername).toHaveBeenCalledWith('Lau')

    expect(findCategoryBySlug).toHaveBeenCalledWith('visual-culture')

    expect(repositoryMocks.findPublicArticles).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      authorId: 'author-1',
      categoryId: CATEGORY_ID,
    })

    expect(result).toEqual({
      articles: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    })
  })

  it('automatically assigns the authenticated user as author', async () => {
    await createUserArticle({
      accessToken: 'token',
      userId: USER_ID,
      input: {
        title: 'Independent fashion',
        content: '',
        language: 'es',
        status: 'draft',
        categoryIds: [],
      },
    })

    expect(repositoryMocks.createArticle).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        author_id: USER_ID,
      }),
    )
  })

  it('creates a unique slug when the original slug already exists', async () => {
    repositoryMocks.findArticleBySlug
      .mockResolvedValueOnce({
        id: '55555555-5555-4555-8555-555555555555',
      })
      .mockResolvedValueOnce(null)

    await createUserArticle({
      accessToken: 'token',
      userId: USER_ID,
      input: {
        title: 'Visual Culture',
        content: '',
        language: 'es',
        status: 'draft',
        categoryIds: [],
      },
    })

    expect(repositoryMocks.createArticle).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        slug: 'visual-culture-2',
      }),
    )
  })

  it('publishes immediately when no publication date is provided', async () => {
    vi.useFakeTimers()

    vi.setSystemTime(new Date('2026-10-14T09:00:00.000Z'))

    try {
      await createUserArticle({
        accessToken: 'token',
        userId: USER_ID,
        input: {
          title: 'Published now',
          content: '',
          language: 'es',
          status: 'published',
          categoryIds: [],
        },
      })

      expect(repositoryMocks.createArticle).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          status: 'published',
          published_at: '2026-10-14T09:00:00.000Z',
        }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps a future publication date for scheduled articles', async () => {
    await createUserArticle({
      accessToken: 'token',
      userId: USER_ID,
      input: {
        title: 'The future of independent fashion',
        content: '',
        language: 'es',
        status: 'published',
        publishedAt: '2026-10-20T10:00:00+02:00',
        categoryIds: [],
      },
    })

    expect(repositoryMocks.createArticle).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        status: 'published',
        published_at: '2026-10-20T08:00:00.000Z',
      }),
    )
  })

  it('rejects categories that do not exist', async () => {
    repositoryMocks.findCategoriesByIds.mockResolvedValue([
      {
        id: CATEGORY_ID,
      },
    ])

    await expect(
      createUserArticle({
        accessToken: 'token',
        userId: USER_ID,
        input: {
          title: 'Categories test',
          content: '',
          language: 'es',
          status: 'draft',
          categoryIds: [CATEGORY_ID, SECOND_CATEGORY_ID],
        },
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'One or more categories do not exist',
    })

    expect(repositoryMocks.createArticle).not.toHaveBeenCalled()
  })

  it('returns pagination metadata for public articles', async () => {
    repositoryMocks.findPublicArticles.mockResolvedValue({
      articles: [STORED_ARTICLE],
      count: 21,
    })

    const result = await listPublicArticles({
      page: 2,
      limit: 10,
    })

    expect(repositoryMocks.findPublicArticles).toHaveBeenCalledWith({
      limit: 10,
      offset: 10,
      authorId: null,
      categoryId: null,
    })

    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
    })
  })

  it('does not allow editing an article that does not belong to the user', async () => {
    repositoryMocks.findOwnedArticleById.mockResolvedValue(null)

    await expect(
      updateUserArticle({
        accessToken: 'token',
        userId: USER_ID,
        articleId: ARTICLE_ID,
        input: {
          title: 'Attempted update',
        },
      }),
    ).rejects.toBeInstanceOf(ArticleServiceError)

    expect(repositoryMocks.updateArticleById).not.toHaveBeenCalled()
  })
})
