import { getArticlePreview } from '../lib/article-content.js'
import FollowAuthorButton from '../components/FollowAuthorButton.jsx'
import ResponsiveImage from '../components/ResponsiveImage.jsx'
import { useEffect, useState } from 'react'
import { usePageMetadata } from '../hooks/usePageMetadata.js'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getPublicAuthor } from '../services/authors.service.js'
import { ApiError } from '../services/api.js'
import { getPublicArticles } from '../services/articles.service.js'

const PAGE_SIZE = 10

function PublicAuthorPage() {
  const { username } = useParams()
  const { i18n, t } = useTranslation()

  const [author, setAuthor] = useState(null)
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
  const [notFound, setNotFound] = useState(false)

  usePageMetadata(
    author
      ? [author.name, author.surname].filter(Boolean).join(' ') ||
          author.username
      : undefined,
    author?.bio,
  )

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getPublicAuthor(username),
      getPublicArticles({
        page,
        limit: PAGE_SIZE,
        author: username,
      }),
    ])
      .then(([authorResponse, articlesResponse]) => {
        if (cancelled) {
          return
        }

        setAuthor(authorResponse.author)
        setArticles(articlesResponse.articles ?? [])

        setPagination(
          articlesResponse.pagination ?? {
            page,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          },
        )

        setError(null)
        setNotFound(false)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load public author:', loadError)

        if (loadError instanceof ApiError && loadError.status === 404) {
          setNotFound(true)
          setError(null)

          return
        }

        setError(t('authors.public.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [username, page, retryKey, t])

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
    setNotFound(false)

    setRetryKey((current) => current + 1)
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

  if (isLoading) {
    return (
      <main className="page public-author-page">
        <p>{t('authors.public.loading')}</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="page public-author-page">
        <section className="public-author-state">
          <p className="page-eyebrow">404</p>

          <h1>{t('authors.public.notFound')}</h1>

          <Link to="/">{t('authors.public.back')}</Link>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page public-author-page">
        <section className="public-author-state">
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

  if (!author) {
    return null
  }

  const displayName =
    [author.name, author.surname].filter(Boolean).join(' ') || author.username

  return (
    <main className="page public-author-page">
      <header className="public-author">
        <p className="page-eyebrow">{t('authors.public.eyebrow')}</p>

        <h1>{displayName}</h1>

        <p className="public-author__username">@{author.username}</p>

        {author.bio && <p className="public-author__bio">{author.bio}</p>}
        <FollowAuthorButton author={author} />
      </header>

      <section
        className="public-author__articles"
        aria-labelledby="author-articles-title"
      >
        <header className="public-author__section-header">
          <h2 id="author-articles-title">{t('authors.public.articles')}</h2>

          <span>
            {t('authors.public.articleCount', {
              count: pagination.total,
            })}
          </span>
        </header>

        {articles.length === 0 ? (
          <div className="public-author__empty">
            <h3>{t('authors.public.emptyTitle')}</h3>

            <p>{t('authors.public.emptyMessage')}</p>
          </div>
        ) : (
          <>
            <div className="public-articles-list">
              {articles.map((article) => {
                const categories =
                  article.article_categories
                    ?.map((relation) => relation.category)
                    .filter(Boolean) ?? []

                const articleUsername =
                  article.author?.username ?? author.username

                const articlePath = `/${articleUsername}/${article.slug}`

                return (
                  <article className="public-article-card" key={article.id}>
                    {article.cover_image_url && (
                      <div className="public-article-card__cover">
                        <Link to={articlePath}>
                          <ResponsiveImage
                            article={article}
                            alt={article.title}
                            loading="lazy"
                          />
                        </Link>
                      </div>
                    )}

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
                                {t(`categories.names.${category.slug}`, {
                                  defaultValue: category.name,
                                })}
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
                      <Link to={articlePath}>{article.title}</Link>
                    </h3>

                    {getArticlePreview(article) && (
                      <p className="public-article-card__excerpt">
                        {getArticlePreview(article)}
                      </p>
                    )}

                    <footer className="public-article-card__footer">
                      <span className="public-article-card__author">
                        {t('articles.public.by', {
                          author: displayName,
                        })}
                      </span>

                      <Link
                        className="public-article-card__read"
                        to={articlePath}
                      >
                        {t('articles.public.read')}
                      </Link>
                    </footer>
                  </article>
                )
              })}
            </div>

            {pagination.totalPages > 1 && (
              <nav
                className="articles-pagination"
                aria-label={t('authors.public.paginationLabel')}
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
      </section>
    </main>
  )
}

export default PublicAuthorPage
