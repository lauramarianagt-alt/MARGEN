import EyeIcon from '../components/EyeIcon.jsx'
import { useState } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'
import { ApiError } from '../services/api.js'

function LoginPage() {
  const { t } = useTranslation()

  const { isAuthenticated, isLoading, login } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const emailConfirmed = searchParams.get('emailConfirmed') === 'true'

  const destination = location.state?.from?.pathname ?? '/'

  async function handleSubmit(event) {
    event.preventDefault()

    setError(null)
    setIsSubmitting(true)

    try {
      await login({
        email,
        password,
      })

      navigate(destination, {
        replace: true,
      })
    } catch (loginError) {
      if (loginError instanceof ApiError && loginError.status === 401) {
        setError(t('auth.login.invalidCredentials'))
      } else {
        setError(t('auth.login.genericError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="page">
        <p>{t('common.loading')}</p>
      </main>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="page auth-page">
      <div className="auth-container">
        <h1>{t('auth.login.title')}</h1>

        {searchParams.get('accountClosed') === 'true' && (
          <p className="auth-message auth-message--success" role="status">
            {t('account.closed')}
          </p>
        )}
        {emailConfirmed && (
          <p className="auth-message auth-message--success" role="status">
            {t('auth.emailConfirmed')}
          </p>
        )}

        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">{t('auth.email')}</label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">{t('auth.password')}</label>

            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                }
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
        </form>

        <p className="auth-alternative">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register">{t('auth.login.registerLink')}</Link>
        </p>
      </div>
    </main>
  )
}

export default LoginPage
