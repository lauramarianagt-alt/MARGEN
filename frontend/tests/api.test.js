import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, ApiError } from '../src/services/api.js'

const jsonResponse = (status, data) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => vi.unstubAllGlobals())

describe('Session refresh across concurrent requests', () => {
  it('shares one refresh when several protected requests return 401', async () => {
    let finishRefresh
    const refresh = new Promise((resolve) => {
      finishRefresh = resolve
    })
    const calls = new Map()
    const fetchMock = vi.fn((url) => {
      if (url.endsWith('/auth/refresh')) return refresh
      const count = (calls.get(url) ?? 0) + 1
      calls.set(url, count)
      return Promise.resolve(jsonResponse(count === 1 ? 401 : 200, { url }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const requests = Promise.all([apiFetch('/me'), apiFetch('/favorites')])
    await vi.waitFor(() => {
      expect(
        fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')),
      ).toHaveLength(1)
    })
    finishRefresh(new Response(null, { status: 204 }))
    const results = await requests
    expect(results).toHaveLength(2)
    expect([...calls.values()]).toEqual([2, 2])
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')),
    ).toHaveLength(1)
  })

  it('does not retry login or refresh forever after another 401', async () => {
    const fetchMock = vi.fn((url) =>
      Promise.resolve(
        url.endsWith('/auth/refresh')
          ? new Response(null, { status: 204 })
          : jsonResponse(401, { error: 'Authentication required' }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiFetch('/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    fetchMock.mockClear()
    await expect(
      apiFetch('/auth/login', { retryOnUnauthorized: false }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('releases a failed refresh so a later request can try again', async () => {
    const fetchMock = vi.fn((url) =>
      Promise.resolve(
        jsonResponse(url.endsWith('/auth/refresh') ? 403 : 401, {
          error: 'Expired session',
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiFetch('/me')).rejects.toMatchObject({ status: 401 })
    await expect(apiFetch('/favorites')).rejects.toMatchObject({ status: 401 })
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')),
    ).toHaveLength(2)
  })
  it('releases the shared refresh after a network failure', async () => {
    const fetchMock = vi.fn((url) =>
      url.endsWith('/auth/refresh')
        ? Promise.reject(new TypeError('Network unavailable'))
        : Promise.resolve(jsonResponse(401, { error: 'Expired session' })),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(apiFetch('/me')).rejects.toMatchObject({ status: 401 })
    await expect(apiFetch('/favorites')).rejects.toMatchObject({ status: 401 })
    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh')),
    ).toHaveLength(2)
  })
})
