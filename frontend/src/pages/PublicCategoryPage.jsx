import ResponsiveImage from '../components/ResponsiveImage.jsx'
import { useEffect, useState } from 'react'
import { usePageMetadata } from '../hooks/usePageMetadata.js'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../services/api.js'
import { getPublicArticles } from '../services/articles.service.js'
import { getPublicCategory } from '../services/categories.service.js'

const PAGE_SIZE = 10

function PublicCategoryPage() {
  const { slug } = useParams()
  const { i18n, t } = useTranslation()

  const [category, setCategory] = useState(null)
  const [articles, setArticles] = useState([])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [pageState, setPageState] = useState({
    slug: null,
    page: 1,
  })

  const [retryKey, setRetryKey] = useState(0)
  const [loadedSlug, setLoadedSlug] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const page = pageState.slug === slug ? pageState.page : 1

  const isRouteLoading = isLoading || loadedSlug !== slug

  usePageMetadata(
    category
      ? t(`categories.names.${category.slug}`, { defaultValue: category.name })
      : undefined,
    category?.description,
  )

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getPublicCategory(slug),
      getPublicArticles({
        page,
        limit: PAGE_SIZE,
        category: slug,
      }),
    ])
      .then(([categoryResponse, articlesResponse]) => {
        if (cancelled) {
          return
        }

        setCategory(categoryResponse)
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

        console.error('Unable to load public category:', loadError)

        setCategory(null)
        setArticles([])

        if (loadError instanceof ApiError && loadError.status === 404) {
          setNotFound(true)
          setError(null)

          return
        }

        setNotFound(false)
        setError(t('categories.public.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedSlug(slug)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [slug, page, retryKey, t])

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

    setPageState({
      slug,
      page: Math.max(1, page - 1),
    })
  }

  function handleNextPage() {
    setIsLoading(true)
    setError(null)

    setPageState({
      slug,
      page: Math.min(pagination.totalPages, page + 1),
    })
  }

  if (isRouteLoading) {
    return (
      <main className="page public-category-page">
        <p>{t('categories.public.loading')}</p>
      </main>
    )
  }

  if (notFound) {
    return (
      <main className="page public-category-page">
        <section className="public-category-state">
          <p className="page-eyebrow">404</p>

          <h1>{t('categories.public.notFound')}</h1>

          <Link to="/">{t('categories.public.back')}</Link>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="page public-category-page">
        <section className="public-category-state">
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

  if (!category) {
    return null
  }

  return (
    <main className="page public-category-page">
      <header className="public-category">
        <p className="page-eyebrow">{t('categories.public.eyebrow')}</p>

        <h1>
          {t(`categories.names.${category.slug}`, {
            defaultValue: category.name,
          })}
        </h1>

        {category.description && (
          <p className="public-category__description">{category.description}</p>
        )}
      </header>

      <section
        className="public-category__articles"
        aria-labelledby="category-articles-title"
      >
        <header className="public-category__section-header">
          <h2 id="category-articles-title">
            {t('categories.public.articles')}
          </h2>

          <span>
            {t('categories.public.articleCount', {
              count: pagination.total,
            })}
          </span>
        </header>

        {articles.length === 0 ? (
          <div className="public-category__empty">
            <h3>{t('categories.public.emptyTitle')}</h3>

            <p>{t('categories.public.emptyMessage')}</p>
          </div>
        ) : (
          <>
            <div className="public-articles-list">
              {articles.map((article) => {
                const categories =
                  article.article_categories
                    ?.map((relation) => relation.category)
                    .filter(Boolean) ?? []

                const articleUsername = article.author?.username

                const authorName =
                  [article.author?.name, article.author?.surname]
                    .filter(Boolean)
                    .join(' ') ||
                  article.author?.username ||
                  ''

                const articlePath = articleUsername
                  ? `/${articleUsername}/${article.slug}`
                  : null

                return (
                  <article className="public-article-card" key={article.id}>
                    {article.cover_image_url && (
                      <div className="public-article-card__cover">
                        {articlePath ? (
                          <Link to={articlePath}>
                            <ResponsiveImage
                              article={article}
                              alt={article.title}
                              loading="lazy"
                            />
                          </Link>
                        ) : (
                          <ResponsiveImage
                            article={article}
                            alt={article.title}
                            loading="lazy"
                          />
                        )}
                      </div>
                    )}

                    <div className="public-article-card__meta">
                      {categories.length > 0 && (
                        <span>
                          {categories
                            .map((articleCategory) => articleCategory.name)
                            .join(' · ')}
                        </span>
                      )}

                      {article.published_at && (
                        <time dateTime={article.published_at}>
                          {formatDate(article.published_at)}
                        </time>
                      )}
                    </div>

                    <h3>
                      {articlePath ? (
                        <Link to={articlePath}>{article.title}</Link>
                      ) : (
                        article.title
                      )}
                    </h3>

                    {article.excerpt && (
                      <p className="public-article-card__excerpt">
                        {article.excerpt}
                      </p>
                    )}

                    <footer className="public-article-card__footer">
                      {articleUsername ? (
                        <Link to={`/${articleUsername}`}>
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

                      {articlePath && (
                        <Link
                          className="public-article-card__read"
                          to={articlePath}
                        >
                          {t('articles.public.read')}
                        </Link>
                      )}
                    </footer>
                  </article>
                )
              })}
            </div>

            {pagination.totalPages > 1 && (
              <nav
                className="articles-pagination"
                aria-label={t('categories.public.paginationLabel')}
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

export default PublicCategoryPage
