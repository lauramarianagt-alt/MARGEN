import { apiFetch } from './api.js'

function buildArticleRequestBody(article, coverFile = null) {
  if (!coverFile) {
    return JSON.stringify(article)
  }

  const formData = new FormData()

  formData.append('article', JSON.stringify(article))
  formData.append('cover', coverFile)

  return formData
}

export function getPublicArticles({
  page = 1,
  limit = 10,
  author = null,
  category = null,
  search = null,
} = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (author) {
    searchParams.set('author', author)
  }

  if (category) {
    searchParams.set('category', category)
  }

  if (search) {
    searchParams.set('search', search)
  }

  return apiFetch(`/articles?${searchParams.toString()}`)
}

export function getPublicArticle(username, slug) {
  return apiFetch(
    `/articles/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
  )
}

export function getMyArticles({ page = 1, limit = 10 } = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return apiFetch(`/me/articles?${searchParams.toString()}`)
}

export function getMyArticle(articleId) {
  return apiFetch(`/me/articles/${encodeURIComponent(articleId)}`)
}

export function createArticle(article, coverFile = null) {
  return apiFetch('/articles', {
    method: 'POST',
    body: buildArticleRequestBody(article, coverFile),
  })
}

export function updateArticle(articleId, article, coverFile = null) {
  return apiFetch(`/articles/${encodeURIComponent(articleId)}`, {
    method: 'PATCH',
    body: buildArticleRequestBody(article, coverFile),
  })
}

export function deleteArticle(articleId) {
  return apiFetch(`/articles/${encodeURIComponent(articleId)}`, {
    method: 'DELETE',
  })
}

export function getFeaturedArticles() {
  return apiFetch('/articles/featured')
}
