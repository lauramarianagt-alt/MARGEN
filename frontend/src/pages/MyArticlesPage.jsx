import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import ArticleStatus from '../components/ArticleStatus.jsx'
import { getMyArticles } from '../services/articles.service.js'

const PAGE_SIZE = 10

function MyArticlesPage() {
  const { i18n, t } = useTranslation()

  const [articles, setArticles] = useState([])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [page, setPage] = useState(1)
  const [retryKey, setRetryKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    getMyArticles({
      page,
      limit: PAGE_SIZE,
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        setArticles(response.articles ?? [])

        setPagination(
          response.pagination ?? {
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          },
        )

        setError(null)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load articles:', loadError)

        setError(t('articles.my.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, retryKey, t])

  function formatDate(date) {
    if (!date) {
      return null
    }

    const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'es-ES'

    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  }

  function handlePreviousPage() {
    setIsLoading(true)
    setError(null)

    setPage((current) => Math.max(1, current - 1))
  }

  function handleNextPage() {
    setIsLoading(true)
    setError(null)

    setPage((current) => Math.min(pagination.totalPages, current + 1))
  }

  function handleRetry() {
    setIsLoading(true)
    setError(null)

    setRetryKey((current) => current + 1)
  }

  if (isLoading) {
    return (
      <main className="page articles-page">
        <p>{t('articles.my.loading')}</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page articles-page">
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
      </main>
    )
  }

  return (
    <main className="page articles-page">
      <header className="articles-page__header">
        <div>
          <p className="page-eyebrow">{t('dashboard.title')}</p>

          <h1>{t('articles.my.title')}</h1>
        </div>

        <div className="articles-page__actions">
          <p className="articles-count">
            {t('articles.my.count', {
              count: pagination.total,
            })}
          </p>

          <Link className="articles-create-link" to="/dashboard/articles/new">
            {t('articles.my.create')}
          </Link>
        </div>
      </header>

      {articles.length === 0 ? (
        <section className="articles-empty">
          <h2>{t('articles.my.emptyTitle')}</h2>

          <p>{t('articles.my.emptyMessage')}</p>
        </section>
      ) : (
        <>
          <div className="articles-list">
            {articles.map((article) => {
              const date = article.published_at ?? article.updated_at

              return (
                <article className="article-row" key={article.id}>
                  <div className="article-row__main">
                    <ArticleStatus article={article} />

                    <h2>{article.title}</h2>

                    {article.excerpt && (
                      <p className="article-row__excerpt">{article.excerpt}</p>
                    )}
                  </div>

                  <div className="article-row__meta">
                    {date && <time dateTime={date}>{formatDate(date)}</time>}

                    <span>{article.language}</span>

                    <div className="article-row__actions">
                      <Link
                        className="article-row__edit"
                        to={`/dashboard/articles/${article.id}/edit`}
                      >
                        {t('articles.my.edit')}
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {pagination.totalPages > 1 && (
            <nav
              className="articles-pagination"
              aria-label={t('articles.pagination.label')}
            >
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={page <= 1}
              >
                {t('articles.pagination.previous')}
              </button>

              <span>
                {t('articles.pagination.page', {
                  page: pagination.page,
                  totalPages: pagination.totalPages,
                })}
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= pagination.totalPages}
              >
                {t('articles.pagination.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export default MyArticlesPage
