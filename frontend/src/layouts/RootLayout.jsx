import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'

function RootLayout() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()

  const { isAuthenticated, isLoading, logout } = useAuth()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const changeLanguage = async (language) => {
    await i18n.changeLanguage(language)

    localStorage.setItem('margen_language', language)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logout()

      navigate('/', {
        replace: true,
      })
    } catch (error) {
      console.error('Unable to log out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand">
          {t('brand.name')}
        </NavLink>

        <nav className="main-navigation">
          <NavLink to="/">{t('navigation.home')}</NavLink>

          {!isLoading && !isAuthenticated && (
            <>
              <NavLink to="/login">{t('navigation.login')}</NavLink>

              <NavLink to="/register">{t('navigation.register')}</NavLink>
            </>
          )}

          {!isLoading && isAuthenticated && (
            <>
              <NavLink to="/dashboard">{t('navigation.dashboard')}</NavLink>

              <button
                type="button"
                className="navigation-button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut
                  ? t('navigation.loggingOut')
                  : t('navigation.logout')}
              </button>
            </>
          )}
        </nav>

        <div className="language-switcher">
          <button
            type="button"
            onClick={() => changeLanguage('es')}
            aria-pressed={i18n.language === 'es'}
          >
            {t('language.es')}
          </button>

          <button
            type="button"
            onClick={() => changeLanguage('en')}
            aria-pressed={i18n.language === 'en'}
          >
            {t('language.en')}
          </button>
        </div>
      </header>

      <Outlet />
    </>
  )
}

export default RootLayout
