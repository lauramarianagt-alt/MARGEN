export const ACCESS_TOKEN_COOKIE = 'margen_access_token'
export const REFRESH_TOKEN_COOKIE = 'margen_refresh_token'

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  }
}

export function setAuthCookies(res, session) {
  const accessTokenMaxAge = session.expires_in
    ? session.expires_in * 1000
    : 60 * 60 * 1000

  res.cookie(
    ACCESS_TOKEN_COOKIE,
    session.access_token,
    {
      ...getBaseCookieOptions(),
      maxAge: accessTokenMaxAge,
    },
  )

  res.cookie(
    REFRESH_TOKEN_COOKIE,
    session.refresh_token,
    {
      ...getBaseCookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  )
}

export function clearAuthCookies(res) {
  const options = getBaseCookieOptions()

  res.clearCookie(ACCESS_TOKEN_COOKIE, options)
  res.clearCookie(REFRESH_TOKEN_COOKIE, options)
}