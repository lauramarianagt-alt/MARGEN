import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ArticleContent from '../components/articles/ArticleContent.jsx'
import ResponsiveImage from '../components/ResponsiveImage.jsx'
import { usePageMetadata } from '../hooks/usePageMetadata.js'
import { getPublicArticle } from '../services/articles.service.js'

export default function AboutPage() {
  const { t } = useTranslation()
  const [article, setArticle] = useState(null)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  usePageMetadata(t('manifesto.about'), article?.excerpt)

  useEffect(() => {
    let active = true
    getPublicArticle('Lau', 'fashion-deserves-more-than-a-feed')
      .then(({ article: story }) => {
        if (active) setArticle(story)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [retryKey])

  return (
    <main className="page about-page">
      <header className="about-page__header">
        <p className="page-eyebrow">{t('manifesto.about')}</p>
        <h1>{article?.title ?? t('manifesto.title')}</h1>
        {article?.excerpt && (
          <p className="public-article__excerpt">{article.excerpt}</p>
        )}
      </header>
      {!article && !error && <p>{t('common.loading')}</p>}
      {error && (
        <div role="alert">
          <p>{t('articles.detail.loadError')}</p>
          <button
            className="navigation-button"
            onClick={() => {
              setError(false)
              setRetryKey((value) => value + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </div>
      )}
      {article && (
        <>
          <ArticleContent content={article.content} />
          {article.cover_image_url && (
            <figure className="about-page__image">
              <ResponsiveImage article={article} alt={article.title} />
            </figure>
          )}
        </>
      )}
      <Link className="about-page__back" to="/">
        ← {t('navigation.home')}
      </Link>
    </main>
  )
}
