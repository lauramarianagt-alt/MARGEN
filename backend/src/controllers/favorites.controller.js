import {
  FavoriteServiceError,
  addUserFavorite,
  getUserFavorite,
  listUserFavorites,
  removeUserFavorite,
} from '../services/favorites.service.js'

import {
  articleIdParamSchema,
  paginationQuerySchema,
} from '../validators/articles.schemas.js'

function sendValidationError(res, validation) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: validation.error.flatten(),
  })
}

function handleFavoriteError(res, error) {
  if (error instanceof FavoriteServiceError) {
    return res.status(error.status).json({
      error: error.message,
    })
  }

  console.error(error)

  return res.status(500).json({
    error: 'Internal server error',
  })
}

export async function listFavorites(req, res) {
  const validation = paginationQuerySchema.safeParse(req.query)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await listUserFavorites({
      accessToken: req.accessToken,
      userId: req.user.id,
      ...validation.data,
    })

    return res.json(result)
  } catch (error) {
    return handleFavoriteError(res, error)
  }
}

export async function getFavorite(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await getUserFavorite({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.json(result)
  } catch (error) {
    return handleFavoriteError(res, error)
  }
}

export async function addFavorite(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const favorite = await addUserFavorite({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.status(201).json({
      favorite,
    })
  } catch (error) {
    return handleFavoriteError(res, error)
  }
}

export async function deleteFavorite(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    await removeUserFavorite({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.status(204).send()
  } catch (error) {
    return handleFavoriteError(res, error)
  }
}
