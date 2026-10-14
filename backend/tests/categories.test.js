import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

import app from '../src/app.js'
import { getCategories } from '../src/services/categories.service.js'

vi.mock('../src/services/categories.service.js', () => ({
  getCategories: vi.fn(),
}))

describe('GET /api/categories', () => {
  it('returns the available categories', async () => {
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

    getCategories.mockResolvedValue(categories)

    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(categories)
  })

  it('returns 500 when categories cannot be loaded', async () => {
    getCategories.mockRejectedValue(new Error('Database unavailable'))

    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: 'Unable to fetch categories',
    })
  })
})
