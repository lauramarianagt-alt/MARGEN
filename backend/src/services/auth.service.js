import { env } from '../config/env.js'
import { supabaseAdmin, supabasePublic } from '../config/supabase.js'

import {
  createProfile,
  findProfileById,
  findProfileByUsername,
} from '../repositories/profiles.repository.js'

export async function registerUser({
  email,
  password,
  username,
  name,
  surname,
  preferredLocale,
}) {
  const existingProfile = await findProfileByUsername(username)

  if (existingProfile) {
    const error = new Error('Username is already in use')
    error.statusCode = 409
    throw error
  }

  const { data, error: signUpError } = await supabasePublic.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: env.frontendUrl,
    },
  })

  if (signUpError) {
    const error = new Error(signUpError.message)
    error.statusCode = 400
    throw error
  }

  if (!data.user) {
    const error = new Error('Unable to create user')
    error.statusCode = 500
    throw error
  }

  try {
    const profile = await createProfile({
      id: data.user.id,
      username,
      name,
      surname,
      preferredLocale,
    })

    return {
      user: data.user,
      profile,
      session: data.session,
    }
  } catch (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id)

    throw profileError
  }
}

export async function loginUser({ email, password }) {
  const { data, error: loginError } =
    await supabasePublic.auth.signInWithPassword({
      email,
      password,
    })

  if (loginError || !data.session || !data.user) {
    const error = new Error('Invalid email or password')
    error.statusCode = 401
    throw error
  }

  const profile = await findProfileById(data.user.id)

  return {
    user: data.user,
    profile,
    session: data.session,
  }
}

export async function refreshUserSession(refreshToken) {
  const { data, error: refreshError } =
    await supabasePublic.auth.refreshSession({
      refresh_token: refreshToken,
    })

  if (refreshError || !data.session) {
    const error = new Error('Unable to refresh session')
    error.statusCode = 401
    throw error
  }

  return data.session
}

export async function getCurrentUser(accessToken) {
  const { data, error: userError } =
    await supabasePublic.auth.getUser(accessToken)

  if (userError || !data.user) {
    const error = new Error('Invalid or expired session')
    error.statusCode = 401
    throw error
  }

  const profile = await findProfileById(data.user.id)

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    profile,
  }
}

export async function confirmEmail(tokenHash, type) {
  const { data, error } = await supabasePublic.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.session) {
    const confirmationError = new Error('Unable to confirm email')

    confirmationError.statusCode = 400

    throw confirmationError
  }

  return data.session
}
