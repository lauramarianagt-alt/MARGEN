import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/authors.service.js', () => {
  class AuthorServiceError extends Error {
    constructor(status, message) {
      super(message)

      this.name = 'AuthorServiceError'
      this.status = status
    }
  }

  return {
    AuthorServiceError,
    getPublicAuthor: vi.fn(),
  }
})

import app from '../src/app.js'
import {
  AuthorServiceError,
  getPublicAuthor,
} from '../src/services/authors.service.js'

describe('authors API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/authors/:username returns a public author', async () => {
    const author = {
      id: 'author-1',
      username: 'Lau',
      name: 'Lau',
      surname: 'Gui',
      bio: null,
      avatar_url: null,
    }

    getPublicAuthor.mockResolvedValue(author)

    const response = await request(app).get('/api/authors/Lau')

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      author,
    })

    expect(getPublicAuthor).toHaveBeenCalledWith('Lau')
  })

  it('GET /api/authors/:username returns 404 when author does not exist', async () => {
    getPublicAuthor.mockRejectedValue(
      new AuthorServiceError(404, 'Author not found'),
    )

    const response = await request(app).get('/api/authors/unknown-user')

    expect(response.status).toBe(404)

    expect(response.body).toEqual({
      error: 'Author not found',
    })
  })

  it('GET /api/authors/:username validates the username', async () => {
    const response = await request(app).get('/api/authors/ab')

    expect(response.status).toBe(400)

    expect(response.body.error).toBe('Invalid request')

    expect(getPublicAuthor).not.toHaveBeenCalled()
  })
})
