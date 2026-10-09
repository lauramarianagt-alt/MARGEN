import { useTranslation } from 'react-i18next'

function HomePage() {
  const { t } = useTranslation()

  return (
    <main className="page home-page">
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

export default HomePage