import {
  CommentServiceError,
  addUserComment,
  listArticleComments,
  removeUserComment,
} from '../services/comments.service.js'

import {
  articleIdParamSchema,
  paginationQuerySchema,
} from '../validators/articles.schemas.js'

import {
  commentIdParamSchema,
  createCommentSchema,
} from '../validators/comments.schemas.js'

function sendValidationError(res, validation) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: validation.error.flatten(),
  })
}

function handleCommentError(res, error) {
  if (error instanceof CommentServiceError) {
    return res.status(error.status).json({
      error: error.message,
    })
  }

  console.error(error)

  return res.status(500).json({
    error: 'Internal server error',
  })
}

export async function listComments(req, res) {
  const paramsValidation = articleIdParamSchema.safeParse(req.params)

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation)
  }

  const queryValidation = paginationQuerySchema.safeParse(req.query)

  if (!queryValidation.success) {
    return sendValidationError(res, queryValidation)
  }

  try {
    const result = await listArticleComments({
      articleId: paramsValidation.data.id,
      ...queryValidation.data,
    })

    return res.json(result)
  } catch (error) {
    return handleCommentError(res, error)
  }
}

export async function addComment(req, res) {
  const paramsValidation = articleIdParamSchema.safeParse(req.params)

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation)
  }

  const bodyValidation = createCommentSchema.safeParse(req.body)

  if (!bodyValidation.success) {
    return sendValidationError(res, bodyValidation)
  }

  try {
    const comment = await addUserComment({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: paramsValidation.data.id,
      content: bodyValidation.data.content,
    })

    return res.status(201).json({
      comment,
    })
  } catch (error) {
    return handleCommentError(res, error)
  }
}

export async function deleteComment(req, res) {
  const validation = commentIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    await removeUserComment({
      accessToken: req.accessToken,
      userId: req.user.id,
      commentId: validation.data.commentId,
    })

    return res.status(204).send()
  } catch (error) {
    return handleCommentError(res, error)
  }
}
