import { apiFetch } from './api.js'
export function getNotifications({ page = 1, limit = 20 } = {}) {
  return apiFetch(`/me/notifications?page=${page}&limit=${limit}`)
}
export function getUnreadCount() {
  return apiFetch('/me/notifications/unread-count')
}
export function markNotificationRead(id) {
  return apiFetch(`/me/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
  })
}
export function markAllNotificationsRead(before) {
  return apiFetch('/me/notifications/read', {
    method: 'PATCH',
    body: JSON.stringify({ before }),
  })
}
