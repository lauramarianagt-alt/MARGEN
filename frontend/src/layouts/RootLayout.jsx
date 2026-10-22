import { useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import NotificationLink from '../components/NotificationLink.jsx'
import BrandLogo from '../components/BrandLogo.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'

function RootLayout() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const { isAuthenticated, isLoading, logout } = useAuth()
  const { unreadCount } = useNotifications()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuToggle = useRef(null)
  const searchToggle = useRef(null)

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
      setIsMenuOpen(false)

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
    setIsMenuOpen(false)
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
      <header
        className={`site-header${isMenuOpen ? ' site-header--menu-open' : ''}`}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          if (isMenuOpen) {
            setIsMenuOpen(false)
            menuToggle.current?.focus()
          }
          if (isSearchOpen) {
            setIsSearchOpen(false)
            setSearchError(null)
            const searchButton = searchToggle.current
            if (
              searchButton &&
              getComputedStyle(searchButton).display !== 'none'
            )
              searchButton.focus()
            else menuToggle.current?.focus()
          }
        }}
      >
        <NavLink
          to="/"
          className="brand"
          aria-label={`${t('brand.name')} · ${t('brand.tagline')}`}
          onClick={() => setIsMenuOpen(false)}
        >
          <BrandLogo name={t('brand.name')} tagline={t('brand.tagline')} />
        </NavLink>

        <nav
          id="main-navigation"
          className={`main-navigation${isMenuOpen ? ' main-navigation--open' : ''}`}
          aria-label={t('navigation.label')}
          onClick={() => setIsMenuOpen(false)}
        >
          <NavLink to="/">{t('navigation.home')}</NavLink>
          <NavLink to="/quienes-somos">{t('manifesto.about')}</NavLink>

          {!isLoading && !isAuthenticated && (
            <>
              <NavLink to="/login">{t('navigation.login')}</NavLink>

              <NavLink to="/register">{t('navigation.register')}</NavLink>
            </>
          )}

          {!isLoading && isAuthenticated && (
            <>
              <NavLink to="/dashboard">{t('navigation.dashboard')}</NavLink>
            </>
          )}
        </nav>

        <div className="site-header__tools">
          <div
            className="language-switcher"
            role="group"
            aria-label={t('language.choose')}
          >
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
          {!isLoading && isAuthenticated && (
            <NotificationLink onClick={() => setIsMenuOpen(false)} />
          )}
          <div className="header-search">
            {isSearchOpen && (
              <form
                id="header-search-form"
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
              ref={searchToggle}
              className="header-search__toggle"
              aria-controls="header-search-form"
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

          {!isLoading && isAuthenticated && (
            <button
              className="navigation-button header-logout"
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label={t(
                isLoggingOut ? 'navigation.loggingOut' : 'navigation.logout',
              )}
              title={t('navigation.logout')}
            >
              <span className="header-logout__label">
                {t(
                  isLoggingOut ? 'navigation.loggingOut' : 'navigation.logout',
                )}
              </span>
              <svg
                className="header-logout__icon"
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 4H4v16h5M14 8l4 4-4 4M8 12h10" />
              </svg>
            </button>
          )}
          <button
            ref={menuToggle}
            className="menu-toggle"
            type="button"
            aria-controls="main-navigation"
            aria-expanded={isMenuOpen}
            aria-label={t(
              isMenuOpen ? 'navigation.closeMenu' : 'navigation.openMenu',
            )}
            onClick={() => {
              setIsMenuOpen((open) => !open)
              setIsSearchOpen(false)
              setSearchError(null)
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              {isMenuOpen ? (
                <>
                  <path d="m6 6 12 12" />
                  <path d="m18 6-12 12" />
                </>
              ) : (
                <>
                  <path d="M4 8h16" />
                  <path d="M4 16h16" />
                </>
              )}
            </svg>
            {unreadCount > 0 && (
              <span className="menu-toggle__count" aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <Outlet key={`${location.pathname}${location.search}`} />
      <footer className="site-footer">
        <div className="site-footer__identity">
          <Link to="/" className="site-footer__brand">
            MARGEN
          </Link>
          <span className="site-footer__year">© 2026</span>
        </div>
        <p>{t('brand.description')}</p>
        <Link to="/dashboard">{t('magazine.contribute')} ↗</Link>
      </footer>
    </>
  )
}

export default RootLayout
