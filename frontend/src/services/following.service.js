import { apiFetch } from './api.js'
export function getFollowing(username) {
  return apiFetch(`/me/following/${encodeURIComponent(username)}`)
}
export function setFollowing(username, following) {
  return apiFetch(`/me/following/${encodeURIComponent(username)}`, {
    method: following ? 'POST' : 'DELETE',
  })
}
export function getPersonalizedFeed({
  page = 1,
  limit = 10,
  search,
  category,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (search) query.set('search', search)
  if (category) query.set('category', category)
  return apiFetch(`/me/feed?${query}`)
}
