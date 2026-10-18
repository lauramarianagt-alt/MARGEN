import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/repositories/authors.repository.js', () => ({
  findPublicAuthorByUsername: vi.fn(),
}))

import { findPublicAuthorByUsername } from '../src/repositories/authors.repository.js'
import { getPublicAuthor } from '../src/services/authors.service.js'

describe('authors service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a public author by username', async () => {
    const author = {
      id: 'author-1',
      username: 'Lau',
      name: 'Lau',
      surname: 'Gui',
      bio: 'Independent fashion writer',
      avatar_url: null,
    }

    findPublicAuthorByUsername.mockResolvedValue(author)

    const result = await getPublicAuthor('Lau')

    expect(findPublicAuthorByUsername).toHaveBeenCalledWith('Lau')

    expect(result).toEqual(author)
  })

  it('throws 404 when the author does not exist', async () => {
    findPublicAuthorByUsername.mockResolvedValue(null)

    await expect(getPublicAuthor('unknown-user')).rejects.toMatchObject({
      name: 'AuthorServiceError',
      status: 404,
      message: 'Author not found',
    })
  })
})
