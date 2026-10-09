import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { ApiError } from '../services/api.js'

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../services/auth.service.js'

import { AuthContext } from './auth-context.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [status, setStatus] =
    useState('loading')

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const data =
          await getCurrentUser()

        if (!active) {
          return
        }

        setUser(data.user)
        setProfile(data.profile)
        setStatus('authenticated')
      } catch (error) {
        if (!active) {
          return
        }

        if (
          !(error instanceof ApiError) ||
          error.status !== 401
        ) {
          console.error(
            'Unable to restore session:',
            error,
          )
        }

        setUser(null)
        setProfile(null)
        setStatus('anonymous')
      }
    }

    loadSession()

    return () => {
      active = false
    }
  }, [])

  async function login(credentials) {
    const data = await loginUser(
      credentials,
    )

    setUser(data.user)
    setProfile(data.profile)
    setStatus('authenticated')

    return data
  }

  async function register(data) {
    return registerUser(data)
  }

  async function logout() {
    await logoutUser()

    setUser(null)
    setProfile(null)
    setStatus('anonymous')
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      status,

      isLoading: status === 'loading',

      isAuthenticated:
        status === 'authenticated',

      login,
      register,
      logout,
    }),
    [
      user,
      profile,
      status,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider