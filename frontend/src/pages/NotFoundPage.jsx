import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMetadata } from '../hooks/usePageMetadata.js'

export default function NotFoundPage() {
  const { t } = useTranslation()
  usePageMetadata(t('notFound.title'))

  return (
    <main className="page">
      <section className="public-article-state">
        <p className="page-eyebrow">404</p>
        <h1>{t('notFound.title')}</h1>
        <Link to="/">{t('notFound.back')}</Link>
      </section>
    </main>
  )
}
