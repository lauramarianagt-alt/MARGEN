import {
  addArticleCategories,
  createArticle,
  deleteArticleById,
  findArticleBySlug,
  findCategoriesByIds,
  findOwnedArticleById,
  findOwnArticles,
  findPublicArticleByAuthorAndSlug,
  findPublicArticles,
  getArticleCategoryIds,
  removeArticleCategories,
  updateArticleById,
} from '../repositories/articles.repository.js'

import { findPublicAuthorByUsername } from '../repositories/authors.repository.js'
import { findCategoryBySlug } from '../repositories/categories.repository.js'

export class ArticleServiceError extends Error {
  constructor(status, message) {
    super(message)

    this.name = 'ArticleServiceError'
    this.status = status
  }
}

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property)
}

function slugify(value) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'article'
}

function getUniqueCategoryIds(categoryIds = []) {
  return [...new Set(categoryIds)]
}

async function ensureCategoriesExist(accessToken, categoryIds) {
  const uniqueCategoryIds = getUniqueCategoryIds(categoryIds)

  if (uniqueCategoryIds.length === 0) {
    return uniqueCategoryIds
  }

  const categories = await findCategoriesByIds(accessToken, uniqueCategoryIds)

  if (categories.length !== uniqueCategoryIds.length) {
    throw new ArticleServiceError(400, 'One or more categories do not exist')
  }

  return uniqueCategoryIds
}

async function generateUniqueSlug(
  accessToken,
  authorId,
  title,
  excludedArticleId = null,
) {
  const baseSlug = slugify(title)

  let candidate = baseSlug

  let suffix = 2

  while (true) {
    const existingArticle = await findArticleBySlug(
      accessToken,
      authorId,
      candidate,
      excludedArticleId,
    )

    if (!existingArticle) {
      return candidate
    }

    candidate = `${baseSlug}-${suffix}`

    suffix += 1
  }
}

function resolveCreatePublishedAt(status, publishedAt) {
  if (status === 'draft') {
    return null
  }

  if (publishedAt) {
    return new Date(publishedAt).toISOString()
  }

  return new Date().toISOString()
}

function resolveUpdatePublishedAt(currentArticle, input) {
  const nextStatus = input.status ?? currentArticle.status

  if (nextStatus === 'draft') {
    return null
  }

  if (hasOwn(input, 'publishedAt')) {
    if (input.publishedAt) {
      return new Date(input.publishedAt).toISOString()
    }

    return new Date().toISOString()
  }

  if (currentArticle.status === 'published' && currentArticle.published_at) {
    return currentArticle.published_at
  }

  return new Date().toISOString()
}

function buildPagination(page = 1, limit = 10) {
  const safePage = Math.max(1, Number(page) || 1)

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10))

  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  }
}

function buildEmptyPublicArticleList(page, limit) {
  return {
    articles: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function listPublicArticles({
  page,
  limit,
  author,
  category,
  search,
}) {
  const offset = (page - 1) * limit

  let authorId = null
  let categoryId = null

  if (author) {
    const publicAuthor = await findPublicAuthorByUsername(author)

    if (!publicAuthor) {
      return buildEmptyPublicArticleList(page, limit)
    }

    authorId = publicAuthor.id
  }

  if (category) {
    const publicCategory = await findCategoryBySlug(category)

    if (!publicCategory) {
      return buildEmptyPublicArticleList(page, limit)
    }

    categoryId = publicCategory.id
  }

  const { articles, count } = await findPublicArticles({
    limit,
    offset,
    authorId,
    categoryId,
    search: search ?? null,
  })

  return {
    articles,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  }
}

export async function getPublicArticle({ username, slug }) {
  const author = await findPublicAuthorByUsername(username)

  if (!author) {
    throw new ArticleServiceError(404, 'Article not found')
  }

  const article = await findPublicArticleByAuthorAndSlug(author.id, slug)

  if (!article) {
    throw new ArticleServiceError(404, 'Article not found')
  }

  return article
}

export async function listOwnArticles({
  accessToken,
  userId,
  page = 1,
  limit = 20,
}) {
  const pagination = buildPagination(page, limit)

  const { articles, count } = await findOwnArticles(accessToken, userId, {
    limit: pagination.limit,
    offset: pagination.offset,
  })

  return {
    articles,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count,
      totalPages: count === 0 ? 0 : Math.ceil(count / pagination.limit),
    },
  }
}

export async function getOwnArticle({ accessToken, userId, articleId }) {
  const article = await findOwnedArticleById(accessToken, articleId, userId)

  if (!article) {
    throw new ArticleServiceError(404, 'Article not found')
  }

  return article
}

export async function createUserArticle({ accessToken, userId, input }) {
  const categoryIds = await ensureCategoriesExist(
    accessToken,
    input.categoryIds,
  )

  const slug = await generateUniqueSlug(accessToken, userId, input.title)

  const status = input.status ?? 'draft'

  const articleData = {
    author_id: userId,
    title: input.title,
    slug,
    excerpt: input.excerpt ?? null,
    content: input.content ?? '',
    language: input.language ?? 'es',
    status,
    published_at: resolveCreatePublishedAt(status, input.publishedAt),
  }

  const article = await createArticle(accessToken, articleData)

  try {
    await addArticleCategories(accessToken, article.id, categoryIds)
  } catch (error) {
    try {
      await deleteArticleById(accessToken, article.id, userId)
    } catch {
      // Preserve the original error.
    }

    throw error
  }

  return getOwnArticle({
    accessToken,
    userId,
    articleId: article.id,
  })
}

export async function updateUserArticle({
  accessToken,
  userId,
  articleId,
  input,
}) {
  const currentArticle = await getOwnArticle({
    accessToken,
    userId,
    articleId,
  })

  let categoryIds = null

  if (hasOwn(input, 'categoryIds')) {
    categoryIds = await ensureCategoriesExist(accessToken, input.categoryIds)
  }

  const articlePatch = {}

  if (hasOwn(input, 'title')) {
    articlePatch.title = input.title

    articlePatch.slug = await generateUniqueSlug(
      accessToken,
      userId,
      input.title,
      articleId,
    )
  }

  if (hasOwn(input, 'excerpt')) {
    articlePatch.excerpt = input.excerpt
  }

  if (hasOwn(input, 'content')) {
    articlePatch.content = input.content
  }

  if (hasOwn(input, 'language')) {
    articlePatch.language = input.language
  }

  if (hasOwn(input, 'status')) {
    articlePatch.status = input.status
  }

  if (hasOwn(input, 'status') || hasOwn(input, 'publishedAt')) {
    articlePatch.published_at = resolveUpdatePublishedAt(currentArticle, input)
  }

  if (Object.keys(articlePatch).length > 0) {
    await updateArticleById(accessToken, articleId, userId, articlePatch)
  }

  if (categoryIds !== null) {
    const previousCategoryIds = await getArticleCategoryIds(
      accessToken,
      articleId,
    )

    await removeArticleCategories(accessToken, articleId)

    try {
      await addArticleCategories(accessToken, articleId, categoryIds)
    } catch (error) {
      try {
        await addArticleCategories(accessToken, articleId, previousCategoryIds)
      } catch {
        // Preserve the original error.
      }

      throw error
    }
  }

  return getOwnArticle({
    accessToken,
    userId,
    articleId,
  })
}

export async function deleteUserArticle({ accessToken, userId, articleId }) {
  await getOwnArticle({
    accessToken,
    userId,
    articleId,
  })

  await deleteArticleById(accessToken, articleId, userId)
}
