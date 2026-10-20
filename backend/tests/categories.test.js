import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const categoryMocks = vi.hoisted(() => ({
  getCategories: vi.fn(),
  getPublicCategory: vi.fn(),
}))

vi.mock('../src/services/categories.service.js', () => {
  class CategoryServiceError extends Error {
    constructor(status, message) {
      super(message)

      this.name = 'CategoryServiceError'
      this.status = status
    }
  }

  return {
    CategoryServiceError,
    getCategories: categoryMocks.getCategories,
    getPublicCategory: categoryMocks.getPublicCategory,
  }
})

import app from '../src/app.js'
import { CategoryServiceError } from '../src/services/categories.service.js'

describe('Categories API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/categories returns the available categories', async () => {
    const categories = [
      {
        id: 'category-1',
        name: 'Design',
        slug: 'design',
        description: 'Fashion and design.',
      },
      {
        id: 'category-2',
        name: 'Photography',
        slug: 'photography',
        description: 'Fashion photography.',
      },
    ]

    categoryMocks.getCategories.mockResolvedValue(categories)

    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(categories)

    expect(categoryMocks.getCategories).toHaveBeenCalledOnce()
  })

  it('GET /api/categories returns 500 when categories cannot be loaded', async () => {
    categoryMocks.getCategories.mockRejectedValue(
      new Error('Database unavailable'),
    )

    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(500)

    expect(response.body).toEqual({
      error: 'Unable to fetch categories',
    })
  })

  it('GET /api/categories/:slug returns a public category', async () => {
    const category = {
      id: 'category-1',
      name: 'Visual Culture',
      slug: 'visual-culture',
      description: 'Fashion, image and contemporary visual culture.',
    }

    categoryMocks.getPublicCategory.mockResolvedValue(category)

    const response = await request(app).get('/api/categories/visual-culture')

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      category,
    })

    expect(categoryMocks.getPublicCategory).toHaveBeenCalledWith(
      'visual-culture',
    )
  })

  it('GET /api/categories/:slug returns 404 when the category does not exist', async () => {
    categoryMocks.getPublicCategory.mockRejectedValue(
      new CategoryServiceError(404, 'Category not found'),
    )

    const response = await request(app).get('/api/categories/unknown-category')

    expect(response.status).toBe(404)

    expect(response.body).toEqual({
      error: 'Category not found',
    })

    expect(categoryMocks.getPublicCategory).toHaveBeenCalledWith(
      'unknown-category',
    )
  })

  it('GET /api/categories/:slug validates the category slug', async () => {
    const response = await request(app).get('/api/categories/Visual%20Culture')

    expect(response.status).toBe(400)

    expect(response.body.error).toBe('Invalid request data')

    expect(categoryMocks.getPublicCategory).not.toHaveBeenCalled()
  })
})
