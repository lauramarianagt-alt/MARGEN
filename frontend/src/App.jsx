import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

function App() {
  const { i18n, t } = useTranslation()

  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.slice(1),
    )

    if (hashParams.has('access_token')) {
      const url = new URL(window.location.href)

      url.hash = ''
      url.searchParams.set('emailConfirmed', 'true')

      window.history.replaceState(
        {},
        '',
        `${url.pathname}${url.search}`,
      )
    }
  }, [])

  const changeLanguage = async (language) => {
    await i18n.changeLanguage(language)

    localStorage.setItem(
      'margen_language',
      language,
    )
  }

  return (
    <main className="app">
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

      <p className="eyebrow">
        {t('brand.description')}
      </p>

      <h1>{t('brand.name')}</h1>

      <p className="tagline">
        {t('brand.tagline')}
      </p>
    </main>
  )
}

export default App