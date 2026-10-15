import { apiFetch } from './api.js'

export async function getCategories() {
  const response = await apiFetch('/categories')

  if (Array.isArray(response)) {
    return response
  }

  return response.categories ?? []
}
