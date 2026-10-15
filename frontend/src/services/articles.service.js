import { apiFetch } from './api.js'

export function getMyArticles({ page = 1, limit = 10 } = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return apiFetch(`/me/articles?${searchParams.toString()}`)
}

export function createArticle(article) {
  return apiFetch('/articles', {
    method: 'POST',
    body: JSON.stringify(article),
  })
}
