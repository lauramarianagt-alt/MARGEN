import {
  countArticleLikes,
  createLike,
  deleteLike,
  findLikeableArticleById,
  findLikeByArticleId,
} from '../repositories/likes.repository.js'

export class LikeServiceError extends Error {
  constructor(status, message) {
    super(message)

    this.name = 'LikeServiceError'
    this.status = status
  }
}

function isPublishedArticleAvailable(article) {
  if (article.status !== 'published' || !article.published_at) {
    return false
  }

  return new Date(article.published_at).getTime() <= Date.now()
}

function isUniqueConstraintViolation(error) {
  return error?.cause?.code === '23505'
}

async function ensureLikeableArticle({ accessToken, userId, articleId }) {
  const article = await findLikeableArticleById(accessToken, articleId)

  if (!article) {
    throw new LikeServiceError(404, 'Article not found')
  }

  if (article.author_id === userId) {
    throw new LikeServiceError(403, 'You cannot like your own article')
  }

  if (!isPublishedArticleAvailable(article)) {
    throw new LikeServiceError(404, 'Article not found')
  }

  return article
}

export async function getArticleLikeCount({ articleId }) {
  const count = await countArticleLikes(articleId)

  return {
    count,
  }
}

export async function getUserArticleLike({ accessToken, userId, articleId }) {
  const like = await findLikeByArticleId(accessToken, userId, articleId)

  return {
    isLiked: Boolean(like),
    like,
  }
}

export async function addUserArticleLike({ accessToken, userId, articleId }) {
  await ensureLikeableArticle({
    accessToken,
    userId,
    articleId,
  })

  const existingLike = await findLikeByArticleId(accessToken, userId, articleId)

  if (existingLike) {
    throw new LikeServiceError(409, 'Article is already liked')
  }

  try {
    const like = await createLike(accessToken, userId, articleId)

    const count = await countArticleLikes(articleId)

    return {
      like,
      count,
    }
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      throw new LikeServiceError(409, 'Article is already liked')
    }

    throw error
  }
}

export async function removeUserArticleLike({
  accessToken,
  userId,
  articleId,
}) {
  const existingLike = await findLikeByArticleId(accessToken, userId, articleId)

  if (!existingLike) {
    throw new LikeServiceError(404, 'Like not found')
  }

  const deletedLike = await deleteLike(accessToken, userId, articleId)

  if (!deletedLike) {
    throw new LikeServiceError(404, 'Like not found')
  }

  const count = await countArticleLikes(articleId)

  return {
    like: deletedLike,
    count,
  }
}
