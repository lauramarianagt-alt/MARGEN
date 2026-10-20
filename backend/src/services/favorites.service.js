import {
  createFavorite,
  deleteFavorite,
  findFavoriteableArticleById,
  findFavoriteByArticleId,
  findUserFavorites,
} from '../repositories/favorites.repository.js'

export class FavoriteServiceError extends Error {
  constructor(status, message) {
    super(message)

    this.name = 'FavoriteServiceError'
    this.status = status
  }
}

function buildPagination(page = 1, limit = 20) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20))

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  }
}

function isPublishedArticleAvailable(article) {
  if (article.status !== 'published' || !article.published_at) {
    return false
  }

  return new Date(article.published_at).getTime() <= Date.now()
}

function canFavoriteArticle(article, userId) {
  if (article.author_id === userId) {
    return true
  }

  return isPublishedArticleAvailable(article)
}

function isUniqueConstraintViolation(error) {
  return error?.cause?.code === '23505'
}

async function ensureFavoriteableArticle({ accessToken, userId, articleId }) {
  const article = await findFavoriteableArticleById(accessToken, articleId)

  if (!article || !canFavoriteArticle(article, userId)) {
    throw new FavoriteServiceError(404, 'Article not found')
  }

  return article
}

export async function listUserFavorites({
  accessToken,
  userId,
  page = 1,
  limit = 20,
}) {
  const pagination = buildPagination(page, limit)

  const { favorites, count } = await findUserFavorites(accessToken, userId, {
    limit: pagination.limit,
    offset: pagination.offset,
  })

  return {
    favorites,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count,
      totalPages: count === 0 ? 0 : Math.ceil(count / pagination.limit),
    },
  }
}

export async function getUserFavorite({ accessToken, userId, articleId }) {
  const favorite = await findFavoriteByArticleId(accessToken, userId, articleId)

  return {
    isFavorite: Boolean(favorite),
    favorite,
  }
}

export async function addUserFavorite({ accessToken, userId, articleId }) {
  await ensureFavoriteableArticle({
    accessToken,
    userId,
    articleId,
  })

  const existingFavorite = await findFavoriteByArticleId(
    accessToken,
    userId,
    articleId,
  )

  if (existingFavorite) {
    throw new FavoriteServiceError(409, 'Article is already a favorite')
  }

  try {
    return await createFavorite(accessToken, userId, articleId)
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new FavoriteServiceError(409, 'Article is already a favorite')
    }

    throw error
  }
}

export async function removeUserFavorite({ accessToken, userId, articleId }) {
  const existingFavorite = await findFavoriteByArticleId(
    accessToken,
    userId,
    articleId,
  )

  if (!existingFavorite) {
    throw new FavoriteServiceError(404, 'Favorite not found')
  }

  const deletedFavorite = await deleteFavorite(accessToken, userId, articleId)

  if (!deletedFavorite) {
    throw new FavoriteServiceError(404, 'Favorite not found')
  }

  return deletedFavorite
}
