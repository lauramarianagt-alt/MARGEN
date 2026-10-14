import {
  ArticleServiceError,
  createUserArticle,
  deleteUserArticle,
  getOwnArticle as getOwnArticleService,
  listOwnArticles as listOwnArticlesService,
  listPublicArticles as listPublicArticlesService,
  updateUserArticle,
} from '../services/articles.service.js'

import {
  articleIdParamSchema,
  createArticleSchema,
  paginationQuerySchema,
  updateArticleSchema,
} from '../validators/articles.schemas.js'

function sendValidationError(res, validation) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: validation.error.flatten(),
  })
}

function handleArticleError(res, error) {
  if (error instanceof ArticleServiceError) {
    return res.status(error.status).json({
      error: error.message,
    })
  }

  console.error(error)

  return res.status(500).json({
    error: 'Internal server error',
  })
}

export async function listPublicArticles(req, res) {
  const validation = paginationQuerySchema.safeParse(req.query)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await listPublicArticlesService(validation.data)

    return res.json(result)
  } catch (error) {
    return handleArticleError(res, error)
  }
}

export async function listOwnArticles(req, res) {
  const validation = paginationQuerySchema.safeParse(req.query)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const result = await listOwnArticlesService({
      accessToken: req.accessToken,
      userId: req.user.id,
      ...validation.data,
    })

    return res.json(result)
  } catch (error) {
    return handleArticleError(res, error)
  }
}

export async function getOwnArticle(req, res) {
  const paramsValidation = articleIdParamSchema.safeParse(req.params)

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation)
  }

  try {
    const article = await getOwnArticleService({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: paramsValidation.data.id,
    })

    return res.json({
      article,
    })
  } catch (error) {
    return handleArticleError(res, error)
  }
}

export async function createArticle(req, res) {
  const validation = createArticleSchema.safeParse(req.body)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const article = await createUserArticle({
      accessToken: req.accessToken,
      userId: req.user.id,
      input: validation.data,
    })

    return res.status(201).json({
      article,
    })
  } catch (error) {
    return handleArticleError(res, error)
  }
}

export async function updateArticle(req, res) {
  const paramsValidation = articleIdParamSchema.safeParse(req.params)

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation)
  }

  const bodyValidation = updateArticleSchema.safeParse(req.body)

  if (!bodyValidation.success) {
    return sendValidationError(res, bodyValidation)
  }

  try {
    const article = await updateUserArticle({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: paramsValidation.data.id,
      input: bodyValidation.data,
    })

    return res.json({
      article,
    })
  } catch (error) {
    return handleArticleError(res, error)
  }
}

export async function deleteArticle(req, res) {
  const validation = articleIdParamSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    await deleteUserArticle({
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: validation.data.id,
    })

    return res.status(204).send()
  } catch (error) {
    return handleArticleError(res, error)
  }
}
