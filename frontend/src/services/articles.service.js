import { apiFetch } from './api.js'

export function getPublicArticles({
  page = 1,
  limit = 10,
  author = null,
} = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (author) {
    searchParams.set('author', author)
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

export function createArticle(article) {
  return apiFetch('/articles', {
    method: 'POST',
    body: JSON.stringify(article),
  })
}

export function updateArticle(articleId, article) {
  return apiFetch(`/articles/${encodeURIComponent(articleId)}`, {
    method: 'PATCH',
    body: JSON.stringify(article),
  })
}

export function deleteArticle(articleId) {
  return apiFetch(`/articles/${encodeURIComponent(articleId)}`, {
    method: 'DELETE',
  })
}
