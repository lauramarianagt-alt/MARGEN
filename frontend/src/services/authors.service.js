import { apiFetch } from './api.js'

export function getPublicAuthor(username) {
  return apiFetch(`/authors/${encodeURIComponent(username)}`)
}
