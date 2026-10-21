import { apiFetch } from './api.js'
export function closeMyAccount(input) {
  return apiFetch('/me/account', {
    method: 'DELETE',
    body: JSON.stringify(input),
    retryOnUnauthorized: false,
  })
}
