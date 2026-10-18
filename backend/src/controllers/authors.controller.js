import {
  AuthorServiceError,
  getPublicAuthor as getPublicAuthorService,
} from '../services/authors.service.js'
import { publicAuthorParamsSchema } from '../validators/authors.schemas.js'

export async function getPublicAuthor(req, res) {
  const validation = publicAuthorParamsSchema.safeParse(req.params)

  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request',
      details: validation.error.flatten(),
    })
  }

  try {
    const author = await getPublicAuthorService(validation.data.username)

    return res.json({
      author,
    })
  } catch (error) {
    if (error instanceof AuthorServiceError) {
      return res.status(error.status).json({
        error: error.message,
      })
    }

    console.error('Unable to load public author:', error)

    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}
