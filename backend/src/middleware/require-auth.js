import { supabasePublic } from '../config/supabase.js'
import { ACCESS_TOKEN_COOKIE } from '../utils/auth-cookies.js'

export async function requireAuth(req, res, next) {
  const accessToken = req.cookies[ACCESS_TOKEN_COOKIE]

  if (!accessToken) {
    return res.status(401).json({
      error: 'Authentication required',
    })
  }

  const {
    data,
    error,
  } = await supabasePublic.auth.getUser(accessToken)

  if (error || !data.user) {
    return res.status(401).json({
      error: 'Invalid or expired session',
    })
  }

  req.user = data.user
  req.accessToken = accessToken

  return next()
}