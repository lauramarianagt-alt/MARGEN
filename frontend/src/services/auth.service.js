import { apiFetch } from './api.js'

export function registerUser(data) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
    retryOnUnauthorized: false,
  })
}

export function loginUser(data) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
    retryOnUnauthorized: false,
  })
}

export function logoutUser() {
  return apiFetch('/auth/logout', {
    method: 'POST',
    retryOnUnauthorized: false,
  })
}

export function getCurrentUser() {
  return apiFetch('/me')
}
