import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getPublicArticles } from '../services/articles.service.js'

function HomePage() {
  const { i18n, t } = useTranslation()

  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getPublicArticles({
      page: 1,
      limit: 10,
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        setArticles(response.articles ?? [])
        setError(null)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load public articles:', loadError)

        setError(t('articles.public.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [retryKey, t])

  function formatDate(dateValue) {
    if (!dateValue) {
      return null
    }

    const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'es-ES'

    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateValue))
  }

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setRetryKey((current) => current + 1)
  }

  return (
    <main className="page public-home">
      <section className="public-home__hero">
        <p className="page-eyebrow">{t('articles.public.eyebrow')}</p>

        <h1>{t('articles.public.heroTitle')}</h1>

        <p className="public-home__intro">{t('articles.public.heroIntro')}</p>
      </section>

      <section
        className="public-home__stories"
        aria-labelledby="latest-stories-title"
      >
        <header className="public-home__section-header">
          <h2 id="latest-stories-title">{t('articles.public.latest')}</h2>
        </header>

        {isLoading && <p>{t('articles.public.loading')}</p>}

        {!isLoading && error && (
          <div>
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
          </div>
        )}

        {!isLoading && !error && articles.length === 0 && (
          <div className="public-home__empty">
            <h3>{t('articles.public.emptyTitle')}</h3>

            <p>{t('articles.public.emptyMessage')}</p>
          </div>
        )}

        {!isLoading && !error && articles.length > 0 && (
          <div className="public-articles-list">
            {articles.map((article) => {
              const authorName =
                [article.author?.name, article.author?.surname]
                  .filter(Boolean)
                  .join(' ') || article.author?.username

              const authorUsername = article.author?.username

              const categories =
                article.article_categories
                  ?.map((relation) => relation.category)
                  .filter(Boolean) ?? []

              return (
                <article className="public-article-card" key={article.id}>
                  <div className="public-article-card__meta">
                    {categories.length > 0 && (
                      <span>
                        {categories.map((category, index) => (
                          <span key={category.id}>
                            {index > 0 && ' · '}

                            <Link
                              className="public-article-card__category"
                              to={`/categories/${category.slug}`}
                            >
                              {category.name}
                            </Link>
                          </span>
                        ))}
                      </span>
                    )}

                    {article.published_at && (
                      <time dateTime={article.published_at}>
                        {formatDate(article.published_at)}
                      </time>
                    )}
                  </div>

                  <h3>
                    <Link to={`/${authorUsername}/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>

                  {article.excerpt && (
                    <p className="public-article-card__excerpt">
                      {article.excerpt}
                    </p>
                  )}

                  <footer className="public-article-card__footer">
                    {authorUsername ? (
                      <Link
                        className="public-article-card__author"
                        to={`/${authorUsername}`}
                      >
                        {t('articles.public.by', {
                          author: authorName,
                        })}
                      </Link>
                    ) : (
                      <span>
                        {t('articles.public.by', {
                          author: authorName,
                        })}
                      </span>
                    )}

                    <Link
                      className="public-article-card__read"
                      to={`/${authorUsername}/${article.slug}`}
                    >
                      {t('articles.public.read')}
                    </Link>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default HomePage
