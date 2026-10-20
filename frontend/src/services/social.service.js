import { apiFetch } from './api.js'

function encodeId(id) {
  return encodeURIComponent(id)
}

export function getFavorites({ page = 1, limit = 10 } = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return apiFetch(`/favorites?${searchParams.toString()}`)
}

export function getFavoriteState(articleId) {
  return apiFetch(`/favorites/${encodeId(articleId)}`)
}

export function addFavorite(articleId) {
  return apiFetch(`/favorites/${encodeId(articleId)}`, {
    method: 'POST',
  })
}

export function removeFavorite(articleId) {
  return apiFetch(`/favorites/${encodeId(articleId)}`, {
    method: 'DELETE',
  })
}

export function getArticleLikes(articleId) {
  return apiFetch(`/articles/${encodeId(articleId)}/likes`)
}

export function getArticleLikeState(articleId) {
  return apiFetch(`/articles/${encodeId(articleId)}/likes/me`)
}

export function addArticleLike(articleId) {
  return apiFetch(`/articles/${encodeId(articleId)}/likes`, {
    method: 'POST',
  })
}

export function removeArticleLike(articleId) {
  return apiFetch(`/articles/${encodeId(articleId)}/likes`, {
    method: 'DELETE',
  })
}

export function getArticleComments(articleId, { page = 1, limit = 10 } = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  return apiFetch(
    `/articles/${encodeId(articleId)}/comments?${searchParams.toString()}`,
  )
}

export function addComment(articleId, content) {
  return apiFetch(`/articles/${encodeId(articleId)}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content,
    }),
  })
}

export function deleteComment(commentId) {
  return apiFetch(`/comments/${encodeId(commentId)}`, {
    method: 'DELETE',
  })
}
