import { apiFetch } from './api.js'
export function getPublicGallery(articleId) {
  return apiFetch(`/articles/${encodeURIComponent(articleId)}/gallery`)
}
export function getOwnGallery(articleId) {
  return apiFetch(`/me/gallery?articleId=${encodeURIComponent(articleId)}`)
}
export function uploadGalleryImage({ articleId, file, altText, caption }) {
  const body = new FormData()
  body.append('image', file)
  body.append('altText', altText)
  body.append('caption', caption)
  body.append('articleId', articleId)
  return apiFetch('/me/gallery', { method: 'POST', body })
}
export function updateGalleryImage(id, { altText, caption }) {
  return apiFetch(`/me/gallery/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ altText, caption }),
  })
}
export function deleteGalleryImage(id) {
  return apiFetch(`/me/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
export function saveProfile(profile) {
  return apiFetch('/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(profile),
  })
}
