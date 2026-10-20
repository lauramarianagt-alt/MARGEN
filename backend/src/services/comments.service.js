import {
  createComment,
  deleteComment,
  findCommentableArticleById,
  findCommentById,
  findPublicCommentsByArticleId,
} from '../repositories/comments.repository.js'

export class CommentServiceError extends Error {
  constructor(status, message) {
    super(message)

    this.name = 'CommentServiceError'
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

function normalizeCommentContent(content) {
  if (typeof content !== 'string') {
    throw new CommentServiceError(400, 'Comment content is required')
  }

  const normalizedContent = content.trim()

  if (!normalizedContent) {
    throw new CommentServiceError(400, 'Comment content is required')
  }

  if (normalizedContent.length > 2000) {
    throw new CommentServiceError(
      400,
      'Comment content must be 2000 characters or fewer',
    )
  }

  return normalizedContent
}

function isPublishedArticleAvailable(article) {
  if (article.status !== 'published' || !article.published_at) {
    return false
  }

  return new Date(article.published_at).getTime() <= Date.now()
}

async function ensureCommentableArticle({ accessToken, userId, articleId }) {
  const article = await findCommentableArticleById(accessToken, articleId)

  if (!article) {
    throw new CommentServiceError(404, 'Article not found')
  }

  if (article.author_id === userId) {
    throw new CommentServiceError(403, 'You cannot comment on your own article')
  }

  if (!isPublishedArticleAvailable(article)) {
    throw new CommentServiceError(404, 'Article not found')
  }

  return article
}

export async function listArticleComments({ articleId, page = 1, limit = 20 }) {
  const pagination = buildPagination(page, limit)

  const { comments, count } = await findPublicCommentsByArticleId(articleId, {
    limit: pagination.limit,
    offset: pagination.offset,
  })

  return {
    comments,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count,
      totalPages: count === 0 ? 0 : Math.ceil(count / pagination.limit),
    },
  }
}

export async function addUserComment({
  accessToken,
  userId,
  articleId,
  content,
}) {
  await ensureCommentableArticle({
    accessToken,
    userId,
    articleId,
  })

  const normalizedContent = normalizeCommentContent(content)

  return createComment(accessToken, userId, articleId, normalizedContent)
}

export async function removeUserComment({ accessToken, userId, commentId }) {
  const comment = await findCommentById(accessToken, commentId)

  if (!comment) {
    throw new CommentServiceError(404, 'Comment not found')
  }

  if (comment.author_id !== userId) {
    throw new CommentServiceError(403, 'You cannot delete this comment')
  }

  const deletedComment = await deleteComment(accessToken, commentId, userId)

  if (!deletedComment) {
    throw new CommentServiceError(404, 'Comment not found')
  }

  return deletedComment
}
