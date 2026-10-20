import {
  ArticleServiceError,
  createUserArticle,
  deleteUserArticle,
  getOwnArticle as getOwnArticleService,
  getPublicArticle as getPublicArticleService,
  listOwnArticles as listOwnArticlesService,
  listPublicArticles as listPublicArticlesService,
  updateUserArticle,
} from '../services/articles.service.js'

import {
  articleIdParamSchema,
  createArticleSchema,
  paginationQuerySchema,
  publicArticleParamsSchema,
  publicArticlesQuerySchema,
  updateArticleSchema,
} from '../validators/articles.schemas.js'

function sendValidationError(res, validation) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: validation.error.flatten(),
  })
}

function sendInvalidMultipartData(res) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: {
      formErrors: ['Article data must be valid JSON.'],
      fieldErrors: {},
    },
  })
}

function parseArticleRequestBody(req) {
  if (!req.is('multipart/form-data')) {
    return {
      success: true,
      data: req.body,
    }
  }

  if (typeof req.body?.article !== 'string') {
    return {
      success: false,
    }
  }

  try {
    const article = JSON.parse(req.body.article)

    if (!article || typeof article !== 'object' || Array.isArray(article)) {
      return {
        success: false,
      }
    }

    return {
      success: true,
      data: article,
    }
  } catch {
    return {
      success: false,
    }
  }
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
  const validation = publicArticlesQuerySchema.safeParse(req.query)

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

export async function getPublicArticle(req, res) {
  const validation = publicArticleParamsSchema.safeParse(req.params)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const article = await getPublicArticleService(validation.data)

    return res.json({
      article,
    })
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
  const requestBody = parseArticleRequestBody(req)

  if (!requestBody.success) {
    return sendInvalidMultipartData(res)
  }

  const validation = createArticleSchema.safeParse(requestBody.data)

  if (!validation.success) {
    return sendValidationError(res, validation)
  }

  try {
    const serviceInput = {
      accessToken: req.accessToken,
      userId: req.user.id,
      input: validation.data,
    }

    if (req.file) {
      serviceInput.coverFile = req.file
    }

    const article = await createUserArticle(serviceInput)

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

  const requestBody = parseArticleRequestBody(req)

  if (!requestBody.success) {
    return sendInvalidMultipartData(res)
  }

  const bodyValidation = updateArticleSchema.safeParse(requestBody.data)

  if (!bodyValidation.success) {
    return sendValidationError(res, bodyValidation)
  }

  try {
    const serviceInput = {
      accessToken: req.accessToken,
      userId: req.user.id,
      articleId: paramsValidation.data.id,
      input: bodyValidation.data,
    }

    if (req.file) {
      serviceInput.coverFile = req.file
    }

    const article = await updateUserArticle(serviceInput)

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
