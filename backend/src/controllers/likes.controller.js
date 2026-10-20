import {
  LikeServiceError,
  addUserArticleLike,
  getArticleLikeCount,
  getUserArticleLike,
  removeUserArticleLike,
} from '../services/likes.service.js'

import { articleIdParamSchema } from '../validators/articles.schemas.js'

function sendValidationError(res, validation) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: validation.error.flatten(),
  })
}

function handleLikeError(res, error) {
  if (error instanceof LikeServiceError) {
    return res.status(error.status).json({
      error: error.message,
    })
  }

  console.error(error)

  return res.status(500).json({
    error: 'Internal server error',
  })
}

export async function getArticleLikes(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await getArticleLikeCount({
      articleId: validation.data.id,
    })

    return res.json(result)
  } catch (error) {
    return handleLikeError(res, error)
  }
}

export async function getArticleLike(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await getUserArticleLike({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.json(result)
  } catch (error) {
    return handleLikeError(res, error)
  }
}

export async function addArticleLike(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await addUserArticleLike({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.status(201).json(result)
  } catch (error) {
    return handleLikeError(res, error)
  }
}

export async function deleteArticleLike(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await removeUserArticleLike({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.json(result)
  } catch (error) {
    return handleLikeError(res, error)
  }
}
