import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function usePageMetadata(title, description) {
  const { t } = useTranslation()
  const pageTitle = title
    ? `${title} · MARGEN`
    : `MARGEN · ${t('brand.description')}`
  const pageDescription = description || t('articles.public.heroIntro')

  useEffect(() => {
    const previousTitle = document.title
    const meta = document.querySelector('meta[name="description"]')
    const previousDescription = meta?.content

    document.title = pageTitle
    if (meta) meta.content = pageDescription

    return () => {
      document.title = previousTitle
      if (meta) meta.content = previousDescription
    }
  }, [pageTitle, pageDescription])
}
