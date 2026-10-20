import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'

function RootLayout() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const { isAuthenticated, isLoading, logout } = useAuth()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchError, setSearchError] = useState(null)

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

  function handleSearchToggle() {
    if (isSearchOpen) {
      setIsSearchOpen(false)
      setSearchError(null)

      return
    }

    const currentSearchParams = new URLSearchParams(location.search)

    setSearchInput(
      location.pathname === '/'
        ? (currentSearchParams.get('search') ?? '')
        : '',
    )

    setSearchError(null)
    setIsSearchOpen(true)
  }

  function handleSearchInputChange(event) {
    setSearchInput(event.target.value)

    if (searchError) {
      setSearchError(null)
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault()

    const searchTerm = searchInput.trim()

    if (searchTerm.length === 1) {
      setSearchError(t('articles.search.minLength'))

      return
    }

    setSearchError(null)
    setIsSearchOpen(false)

    if (!searchTerm) {
      navigate('/')

      return
    }

    const searchParams = new URLSearchParams()

    searchParams.set('search', searchTerm)

    navigate(`/?${searchParams.toString()}`)
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

        <div className="site-header__tools">
          <div className="header-search">
            {isSearchOpen && (
              <form
                className="header-search__form"
                role="search"
                onSubmit={handleSearchSubmit}
              >
                <input
                  className="header-search__input"
                  type="search"
                  name="search"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder={t('articles.search.placeholder')}
                  maxLength={100}
                  aria-label={t('articles.search.label')}
                  aria-describedby={
                    searchError ? 'header-search-error' : undefined
                  }
                />

                <button
                  className="header-search__submit"
                  type="submit"
                  aria-label={t('articles.search.submit')}
                  title={t('articles.search.submit')}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>
                </button>
              </form>
            )}

            <button
              className="header-search__toggle"
              type="button"
              onClick={handleSearchToggle}
              aria-expanded={isSearchOpen}
              aria-label={
                isSearchOpen
                  ? t('articles.search.clear')
                  : t('articles.search.label')
              }
              title={
                isSearchOpen
                  ? t('articles.search.clear')
                  : t('articles.search.label')
              }
            >
              {isSearchOpen ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
              )}
            </button>

            {searchError && (
              <p
                id="header-search-error"
                className="header-search__error"
                role="alert"
              >
                {searchError}
              </p>
            )}
          </div>

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
        </div>
      </header>

      <Outlet />
    </>
  )
}

export default RootLayout
