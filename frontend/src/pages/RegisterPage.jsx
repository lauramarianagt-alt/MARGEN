import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'
import { ApiError } from '../services/api.js'

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.7a2 2 0 002.7 2.7" />
        <path d="M9.9 4.2A10.4 10.4 0 0112 4c5.5 0 9 5 9 5a15.6 15.6 0 01-2.1 2.6" />
        <path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5a9.8 9.8 0 004-.8" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function RegisterPage() {
  const { i18n, t } = useTranslation()

  const { isAuthenticated, isLoading, register } = useAuth()

  const initialLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es'

  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferredLocale: initialLanguage,
  })

  const [showPassword, setShowPassword] = useState(false)

  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [error, setError] = useState(null)

  const [registrationComplete, setRegistrationComplete] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (name === 'password' || name === 'confirmPassword') {
      setError(null)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.passwordMismatch'))

      return
    }

    setIsSubmitting(true)

    try {
      const { confirmPassword, ...registrationData } = formData

      void confirmPassword

      const response = await register(registrationData)

      if (response.requiresEmailConfirmation) {
        setRegistrationComplete(true)
      }
    } catch (registerError) {
      if (registerError instanceof ApiError && registerError.status === 409) {
        setError(t('auth.register.usernameTaken'))
      } else if (
        registerError instanceof ApiError &&
        registerError.data?.details?.some((issue) => issue.field === 'username')
      ) {
        setError(t('auth.register.invalidUsername'))
      } else {
        setError(t('auth.register.genericError'))
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
    return <Navigate to="/dashboard" replace />
  }

  if (registrationComplete) {
    return (
      <main className="page auth-page">
        <div className="auth-container">
          <h1>{t('auth.register.successTitle')}</h1>

          <p className="auth-message auth-message--success">
            {t('auth.register.successMessage')}
          </p>

          <Link to="/login">{t('auth.register.loginLink')}</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page auth-page">
      <div className="auth-container">
        <h1>{t('auth.register.title')}</h1>

        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">{t('auth.name')}</label>

            <input
              id="name"
              name="name"
              type="text"
              autoComplete="given-name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="surname">{t('auth.surname')}</label>

            <input
              id="surname"
              name="surname"
              type="text"
              autoComplete="family-name"
              value={formData.surname}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-field">
            <label htmlFor="username">{t('auth.username')}</label>

            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              pattern="[a-zA-Z0-9_\-]+"
              aria-describedby="username-help"
              minLength="3"
              maxLength="30"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isSubmitting}
            />
            <p id="username-help" className="article-editor-help">
              {t('auth.register.usernameHelp')}
            </p>
          </div>

          <div className="form-field">
            <label htmlFor="email">{t('auth.email')}</label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
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
                autoComplete="new-password"
                minLength="8"
                value={formData.password}
                onChange={handleChange}
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
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>

            <div className="password-field">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength="8"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword
                    ? t('auth.hidePassword')
                    : t('auth.showPassword')
                }
                aria-pressed={showConfirmPassword}
              >
                <EyeIcon hidden={showConfirmPassword} />
              </button>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="preferredLocale">
              {t('auth.preferredLanguage')}
            </label>

            <select
              id="preferredLocale"
              name="preferredLocale"
              value={formData.preferredLocale}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="es">{t('language.es')}</option>

              <option value="en">{t('language.en')}</option>
            </select>
          </div>

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('auth.register.submitting')
              : t('auth.register.submit')}
          </button>
        </form>

        <p className="auth-alternative">
          {t('auth.register.hasAccount')}{' '}
          <Link to="/login">{t('auth.register.loginLink')}</Link>
        </p>
      </div>
    </main>
  )
}

export default RegisterPage
