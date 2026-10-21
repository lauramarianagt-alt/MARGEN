import { ZodError } from 'zod'
import { env } from '../config/env.js'

import {
  confirmEmail,
  getCurrentUser,
  loginUser,
  refreshUserSession,
  registerUser,
} from '../services/auth.service.js'

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from '../utils/auth-cookies.js'

import { loginSchema, registerSchema } from '../validators/auth.schemas.js'

function sendValidationError(res, error) {
  return res.status(400).json({
    error: 'Invalid request data',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    })),
  })
}

export async function register(req, res) {
  try {
    const input = registerSchema.parse(req.body)

    const { user, profile, session } = await registerUser(input)

    if (session) {
      setAuthCookies(res, session)
    }

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      requiresEmailConfirmation: !session,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error)
    }

    console.error('Registration error:', error)

    return res.status(error.statusCode ?? 500).json({
      error: error.message ?? 'Unable to register user',
    })
  }
}

export async function login(req, res) {
  try {
    const input = loginSchema.parse(req.body)

    const { user, profile, session } = await loginUser(input)

    setAuthCookies(res, session)

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error)
    }

    console.error('Login error:', error)

    return res.status(error.statusCode ?? 500).json({
      error: error.message ?? 'Unable to log in',
    })
  }
}

export async function logout(req, res) {
  clearAuthCookies(res)

  return res.status(204).send()
}

export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE]

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token is missing',
      })
    }

    const session = await refreshUserSession(refreshToken)

    setAuthCookies(res, session)

    return res.status(204).send()
  } catch (error) {
    clearAuthCookies(res)

    return res.status(error.statusCode ?? 401).json({
      error: error.message ?? 'Unable to refresh session',
    })
  }
}

export async function me(req, res) {
  try {
    const accessToken = req.cookies[ACCESS_TOKEN_COOKIE]

    const currentUser = await getCurrentUser(accessToken)

    return res.status(200).json(currentUser)
  } catch (error) {
    return res.status(error.statusCode ?? 401).json({
      error: error.message ?? 'Authentication required',
    })
  }
}

export async function confirm(req, res) {
  try {
    const { token_hash: tokenHash, type } = req.query

    if (!tokenHash || !type) {
      return res.status(400).json({
        error: 'Confirmation token is missing',
      })
    }

    const session = await confirmEmail(tokenHash, type)

    setAuthCookies(res, session)

    return res.redirect(`${env.frontendUrl}/?emailConfirmed=true`)
  } catch (error) {
    console.error('Email confirmation error:', error)

    return res.redirect(`${env.frontendUrl}/?emailConfirmed=false`)
  }
}
