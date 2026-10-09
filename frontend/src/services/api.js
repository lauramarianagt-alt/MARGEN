const API_URL =
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/api'

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)

    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(path, options = {}) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      credentials: 'include',

      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },

      ...options,
    },
  )

  if (response.status === 204) {
    return null
  }

  const contentType =
    response.headers.get('content-type')

  const data = contentType?.includes(
    'application/json',
  )
    ? await response.json()
    : null

  if (!response.ok) {
    throw new ApiError(
      data?.error ?? 'Request failed',
      response.status,
      data,
    )
  }

  return data
}

export async function apiFetch(
  path,
  options = {},
) {
  const {
    retryOnUnauthorized = true,
    ...requestOptions
  } = options

  try {
    return await request(
      path,
      requestOptions,
    )
  } catch (error) {
    const shouldRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      retryOnUnauthorized

    if (!shouldRefresh) {
      throw error
    }

    const refreshResponse = await fetch(
      `${API_URL}/auth/refresh`,
      {
        method: 'POST',
        credentials: 'include',
      },
    )

    if (!refreshResponse.ok) {
      throw error
    }

    return request(
      path,
      requestOptions,
    )
  }
}