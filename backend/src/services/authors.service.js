import { findPublicAuthorByUsername } from '../repositories/authors.repository.js'

export class AuthorServiceError extends Error {
  constructor(status, message) {
    super(message)

    this.name = 'AuthorServiceError'
    this.status = status
  }
}

export async function getPublicAuthor(username) {
  const author = await findPublicAuthorByUsername(username)

  if (!author) {
    throw new AuthorServiceError(404, 'Author not found')
  }

  return author
}
