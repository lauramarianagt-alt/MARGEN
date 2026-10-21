const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

let refreshPromise = null

function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)

    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(path, options = {}) {
  const { headers: optionHeaders, ...fetchOptions } = options

  const headers = new Headers(optionHeaders ?? {})

  const isFormData = options.body instanceof FormData

  if (options.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers,
  })

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type')

  const data = contentType?.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    throw new ApiError(data?.error ?? 'Request failed', response.status, data)
  }

  return data
}

export async function apiFetch(path, options = {}) {
  const { retryOnUnauthorized = true, ...requestOptions } = options

  try {
    return await request(path, requestOptions)
  } catch (error) {
    const shouldRefresh =
      error instanceof ApiError && error.status === 401 && retryOnUnauthorized

    if (!shouldRefresh) {
      throw error
    }

    if (!(await refreshSession())) {
      throw error
    }

    return request(path, requestOptions)
  }
}
