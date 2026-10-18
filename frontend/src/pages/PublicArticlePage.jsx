import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../services/api.js'
import { getPublicArticle } from '../services/articles.service.js'

function PublicArticlePage() {
  const { username, slug } = useParams()
  const { i18n, t } = useTranslation()

  const [article, setArticle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getPublicArticle(username, slug)
      .then((response) => {
        if (cancelled) {
          return
        }

        setArticle(response.article)
        setError(null)
        setNotFound(false)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load public article:', loadError)

        if (loadError instanceof ApiError && loadError.status === 404) {
          setNotFound(true)
          setError(null)

          return
        }

        setError(t('articles.detail.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [username, slug, retryKey, t])

  function formatDate(dateValue) {
    if (!dateValue) {
      return null
    }

    const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'es-ES'

    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateValue))
  }

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setNotFound(false)

    setRetryKey((current) => current + 1)
  }

  if (isLoading) {
    return (
      <main className="page public-article-page">
        <p>{t('articles.detail.loading')}</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="page public-article-page">
        <section className="public-article-state">
          <p className="page-eyebrow">404</p>

          <h1>{t('articles.detail.notFound')}</h1>

          <Link to="/">{t('articles.detail.back')}</Link>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page public-article-page">
        <section className="public-article-state">
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>

          <button
            className="navigation-button"
            type="button"
            onClick={handleRetry}
          >
            {t('common.retry')}
          </button>
        </section>
      </main>
    )
  }

  if (!article) {
    return null
  }

  const authorName =
    [article.author?.name, article.author?.surname].filter(Boolean).join(' ') ||
    article.author?.username

  const categories =
    article.article_categories
      ?.map((relation) => relation.category)
      .filter(Boolean) ?? []

  return (
    <main className="page public-article-page">
      <article className="public-article">
        <header className="public-article__header">
          {categories.length > 0 && (
            <p className="public-article__categories">
              {categories.map((category) => category.name).join(' · ')}
            </p>
          )}

          <h1>{article.title}</h1>

          {article.excerpt && (
            <p className="public-article__excerpt">{article.excerpt}</p>
          )}

          <div className="public-article__meta">
            <span>
              {t('articles.public.by', {
                author: authorName,
              })}
            </span>

            {article.published_at && (
              <time dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
            )}

            <span>{article.language.toUpperCase()}</span>
          </div>
        </header>

        <div className="public-article__content">{article.content}</div>

        <footer className="public-article__footer">
          <Link to="/">← {t('articles.detail.back')}</Link>
        </footer>
      </article>
    </main>
  )
}

export default PublicArticlePage
