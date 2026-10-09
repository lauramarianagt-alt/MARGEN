import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function RootLayout() {
  const { i18n, t } = useTranslation()

  const changeLanguage = async (language) => {
    await i18n.changeLanguage(language)

    localStorage.setItem(
      'margen_language',
      language,
    )
  }

  return (
    <>
      <header className="site-header">
        <NavLink
          to="/"
          className="brand"
        >
          {t('brand.name')}
        </NavLink>

        <nav className="main-navigation">
          <NavLink to="/">
            {t('navigation.home')}
          </NavLink>

          <NavLink to="/login">
            {t('navigation.login')}
          </NavLink>

          <NavLink to="/register">
            {t('navigation.register')}
          </NavLink>

          <NavLink to="/dashboard">
            {t('navigation.dashboard')}
          </NavLink>
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