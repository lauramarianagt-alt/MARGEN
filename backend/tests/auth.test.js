import request from 'supertest'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import app from '../src/app.js'

import {
  getCurrentUser,
  loginUser,
  refreshUserSession,
  registerUser,
} from '../src/services/auth.service.js'

import { supabasePublic } from '../src/config/supabase.js'

vi.mock('../src/services/auth.service.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  refreshUserSession: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: {
    auth: {
      getUser: vi.fn(),
    },
  },

  supabaseAdmin: {},

  createSupabaseUserClient: vi.fn(),
}))

const profile = {
  id: 'user-123',
  username: 'lauragt',
  name: 'Laura',
  surname: 'Guillén',
  bio: null,
  avatar_url: null,
  preferred_locale: 'es',
  created_at: '2026-10-07T00:00:00.000Z',
  updated_at: '2026-10-07T00:00:00.000Z',
}

const user = {
  id: 'user-123',
  email: 'laura@example.com',
}

const session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    registerUser.mockResolvedValue({
      user,
      profile,
      session: null,
    })

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'laura@example.com',
        password: 'Password123!',
        username: 'lauragt',
        name: 'Laura',
        surname: 'Guillén',
        preferredLocale: 'es',
      })

    expect(response.status).toBe(201)

    expect(response.body).toEqual({
      user,
      profile,
      requiresEmailConfirmation: true,
    })

    expect(registerUser).toHaveBeenCalledWith({
      email: 'laura@example.com',
      password: 'Password123!',
      username: 'lauragt',
      name: 'Laura',
      surname: 'Guillén',
      preferredLocale: 'es',
    })
  })

  it('rejects invalid registration data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        password: '123',
        username: 'a',
        name: '',
        surname: '',
      })

    expect(response.status).toBe(400)

    expect(response.body.error).toBe(
      'Invalid request data',
    )

    expect(registerUser).not.toHaveBeenCalled()
  })

  it('returns 409 when username is already in use', async () => {
    const error = new Error(
      'Username is already in use',
    )

    error.statusCode = 409

    registerUser.mockRejectedValue(error)

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'laura@example.com',
        password: 'Password123!',
        username: 'lauragt',
        name: 'Laura',
        surname: 'Guillén',
        preferredLocale: 'es',
      })

    expect(response.status).toBe(409)

    expect(response.body).toEqual({
      error: 'Username is already in use',
    })
  })
})

describe('POST /api/auth/login', () => {
  it('logs in and sets HttpOnly cookies', async () => {
    loginUser.mockResolvedValue({
      user,
      profile,
      session,
    })

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'laura@example.com',
        password: 'Password123!',
      })

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      user,
      profile,
    })

    const cookies = response.headers['set-cookie']

    expect(cookies).toBeDefined()

    const cookieHeader = cookies.join(';')

    expect(cookieHeader).toContain(
      'margen_access_token=',
    )

    expect(cookieHeader).toContain(
      'margen_refresh_token=',
    )

    expect(cookieHeader).toContain('HttpOnly')
    expect(cookieHeader).toContain('SameSite=Lax')
  })

  it('returns 401 for invalid credentials', async () => {
    const error = new Error(
      'Invalid email or password',
    )

    error.statusCode = 401

    loginUser.mockRejectedValue(error)

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'laura@example.com',
        password: 'WrongPassword123!',
      })

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      error: 'Invalid email or password',
    })
  })
})

describe('GET /api/me', () => {
  it('returns 401 without an access cookie', async () => {
    const response = await request(app)
      .get('/api/me')

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      error: 'Authentication required',
    })
  })

  it('returns the authenticated user', async () => {
    supabasePublic.auth.getUser.mockResolvedValue({
      data: {
        user,
      },
      error: null,
    })

    getCurrentUser.mockResolvedValue({
      user,
      profile,
    })

    const response = await request(app)
      .get('/api/me')
      .set(
        'Cookie',
        'margen_access_token=access-token',
      )

    expect(response.status).toBe(200)

    expect(response.body).toEqual({
      user,
      profile,
    })

    expect(
      supabasePublic.auth.getUser,
    ).toHaveBeenCalledWith('access-token')

    expect(
      getCurrentUser,
    ).toHaveBeenCalledWith('access-token')
  })
})

describe('POST /api/auth/refresh', () => {
  it('refreshes the session and sets new cookies', async () => {
    refreshUserSession.mockResolvedValue(session)

    const response = await request(app)
      .post('/api/auth/refresh')
      .set(
        'Cookie',
        'margen_refresh_token=refresh-token',
      )

    expect(response.status).toBe(204)

    expect(
      refreshUserSession,
    ).toHaveBeenCalledWith('refresh-token')

    const cookies = response.headers['set-cookie']

    expect(cookies).toBeDefined()

    const cookieHeader = cookies.join(';')

    expect(cookieHeader).toContain(
      'margen_access_token=',
    )

    expect(cookieHeader).toContain(
      'margen_refresh_token=',
    )

    expect(cookieHeader).toContain('HttpOnly')
  })

  it('returns 401 without a refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')

    expect(response.status).toBe(401)

    expect(response.body).toEqual({
      error: 'Refresh token is missing',
    })
  })
})

describe('POST /api/auth/logout', () => {
  it('clears authentication cookies', async () => {
    const response = await request(app)
      .post('/api/auth/logout')

    expect(response.status).toBe(204)

    const cookies = response.headers['set-cookie']

    expect(cookies).toBeDefined()

    const cookieHeader = cookies.join(';')

    expect(cookieHeader).toContain(
      'margen_access_token=',
    )

    expect(cookieHeader).toContain(
      'margen_refresh_token=',
    )
  })
})