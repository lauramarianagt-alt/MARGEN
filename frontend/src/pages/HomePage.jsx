import { getArticlePreview } from '../lib/article-content.js'
import CategoryMenu from '../components/CategoryMenu.jsx'
import FeaturedArticlesCarousel from '../components/FeaturedArticlesCarousel.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { getPersonalizedFeed } from '../services/following.service.js'
import { useEffect, useState } from 'react'
import { usePageMetadata } from '../hooks/usePageMetadata.js'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ResponsiveImage from '../components/ResponsiveImage.jsx'

import { getPublicArticles } from '../services/articles.service.js'
import { getCategories } from '../services/categories.service.js'

const PAGE_SIZE = 10
const FEATURED_CATEGORIES = ['design', 'beauty', 'visual-culture']

// Art direction for the opening issue; new stories use the same varied rhythm.
const EDITORIAL_LAYOUTS = {
  'the-dressing-table-as-a-personal-archive': 'panorama',
  'la-cosmetica-tambien-se-disena': 'portrait',
  title: 'standard',
  netflix: 'typographic',
  creations: 'standard',
  'visual-culture': 'portrait',
  'the-future-of-independent-fashion': 'standard',
  'fashion-deserves-more-than-a-feed': 'quote',
}
const EDITORIAL_RHYTHM = [
  'panorama',
  'portrait',
  'standard',
  'typographic',
  'quote',
  'standard',
]

function HomePage() {
  const { i18n, t } = useTranslation()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState([])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [categories, setCategories] = useState([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(null)
  const [categoriesRetryKey, setCategoriesRetryKey] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const searchTerm = searchParams.get('search')?.trim() ?? ''
  const activeCategory = searchParams.get('category')?.trim() ?? ''

  const pageParam = Number(searchParams.get('page'))

  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1

  const isSearchActive = searchTerm.length >= 2
  const isCategoryActive = activeCategory.length > 0

  const featuredCategories = FEATURED_CATEGORIES.map((slug) =>
    categories.find((category) => category.slug === slug),
  ).filter(Boolean)
  const moreCategories = categories.filter(
    (category) => !FEATURED_CATEGORIES.includes(category.slug),
  )
  const moreCategoryValue = moreCategories.some(
    (category) => category.slug === activeCategory,
  )
    ? activeCategory
    : ''

  const selectedCategory =
    categories.find((category) => category.slug === activeCategory) ?? null

  usePageMetadata()

  useEffect(() => {
    let cancelled = false

    getCategories()
      .then((response) => {
        if (cancelled) {
          return
        }

        setCategories(response)
        setCategoriesError(null)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load public categories:', loadError)

        setCategoriesError(t('articles.filters.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsCategoriesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [categoriesRetryKey, t])

  useEffect(() => {
    let cancelled = false

    if (isAuthLoading) return
    const loadArticles = isAuthenticated
      ? getPersonalizedFeed
      : getPublicArticles
    loadArticles({
      page,
      limit: PAGE_SIZE,
      search: isSearchActive ? searchTerm : null,
      category: isCategoryActive ? activeCategory : null,
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
  }, [
    isAuthenticated,
    isAuthLoading,
    page,
    searchTerm,
    isSearchActive,
    activeCategory,
    isCategoryActive,
    retryKey,
    t,
  ])

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

  function updateSearchParams(update) {
    const nextParams = new URLSearchParams(searchParams)

    update(nextParams)

    setSearchParams(nextParams)
  }

  function handleRetry() {
    setIsLoading(true)
    setError(null)

    setRetryKey((current) => current + 1)
  }

  function handleCategoriesRetry() {
    setIsCategoriesLoading(true)
    setCategoriesError(null)

    setCategoriesRetryKey((current) => current + 1)
  }

  function handleClearSearch() {
    setIsLoading(true)
    setError(null)

    updateSearchParams((nextParams) => {
      nextParams.delete('search')
      nextParams.delete('page')
    })
  }

  function handleCategoryChange(categorySlug) {
    if (categorySlug === activeCategory) {
      return
    }

    setIsLoading(true)
    setError(null)

    updateSearchParams((nextParams) => {
      if (categorySlug) {
        nextParams.set('category', categorySlug)
      } else {
        nextParams.delete('category')
      }

      nextParams.delete('page')
    })
  }

  function handlePreviousPage() {
    setIsLoading(true)
    setError(null)

    const previousPage = Math.max(1, page - 1)

    updateSearchParams((nextParams) => {
      if (previousPage === 1) {
        nextParams.delete('page')
      } else {
        nextParams.set('page', String(previousPage))
      }
    })
  }

  function handleNextPage() {
    setIsLoading(true)
    setError(null)

    const nextPage = Math.min(pagination.totalPages, page + 1)

    updateSearchParams((nextParams) => {
      nextParams.set('page', String(nextPage))
    })
  }

  return (
    <main
      className={`page public-home${isSearchActive ? ' public-home--search' : ''}`}
    >
      <section className="public-home__hero">
        {!isSearchActive && <FeaturedArticlesCarousel />}

        <section
          className="public-category-filter"
          aria-labelledby="category-filter-title"
        >
          <h2
            id="category-filter-title"
            className="public-category-filter__title"
          >
            {t('articles.filters.label')}
          </h2>

          {isCategoriesLoading && <p>{t('articles.filters.loading')}</p>}

          {!isCategoriesLoading && categoriesError && (
            <div>
              <p className="auth-message auth-message--error" role="alert">
                {categoriesError}
              </p>

              <button
                className="navigation-button"
                type="button"
                onClick={handleCategoriesRetry}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!isCategoriesLoading &&
            !categoriesError &&
            categories.length > 0 && (
              <div
                className="public-category-filter__options"
                aria-label={t('articles.filters.label')}
              >
                <div className="public-category-filter__shortcuts">
                  <button
                    className={`public-category-filter__button${
                      !isCategoryActive
                        ? ' public-category-filter__button--active'
                        : ''
                    }`}
                    type="button"
                    aria-pressed={!isCategoryActive}
                    onClick={() => handleCategoryChange('')}
                  >
                    {t('articles.filters.all')}
                  </button>

                  {featuredCategories.map((category) => {
                    const isActive = activeCategory === category.slug

                    return (
                      <button
                        className={`public-category-filter__button${
                          isActive
                            ? ' public-category-filter__button--active'
                            : ''
                        }`}
                        type="button"
                        key={category.id}
                        aria-pressed={isActive}
                        onClick={() => handleCategoryChange(category.slug)}
                      >
                        {t(`categories.names.${category.slug}`, {
                          defaultValue: category.name,
                        })}
                      </button>
                    )
                  })}
                </div>
                {moreCategories.length > 0 && (
                  <CategoryMenu
                    categories={moreCategories}
                    value={moreCategoryValue}
                    onChange={handleCategoryChange}
                  />
                )}
              </div>
            )}
        </section>
      </section>

      <section
        className="public-home__stories"
        aria-labelledby="latest-stories-title"
      >
        <header className="public-home__section-header">
          <div>
            <h2 id="latest-stories-title">
              {isSearchActive
                ? t('articles.search.results')
                : isAuthenticated
                  ? t('following.forYou')
                  : t('articles.public.latest')}
            </h2>

            {isSearchActive && (
              <>
                <p>
                  {t('articles.search.resultCount', {
                    count: pagination.total,
                    search: searchTerm,
                  })}
                </p>

                <button
                  className="navigation-button"
                  type="button"
                  onClick={handleClearSearch}
                >
                  {t('articles.search.clear')}
                </button>
              </>
            )}

            {isCategoryActive && selectedCategory && (
              <p className="public-home__active-category">
                <Link to={`/categories/${selectedCategory.slug}`}>
                  {t(`categories.names.${selectedCategory.slug}`, {
                    defaultValue: selectedCategory.name,
                  })}
                </Link>
              </p>
            )}
          </div>
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
            <h3>
              {isSearchActive
                ? t('articles.search.emptyTitle')
                : isCategoryActive
                  ? t('articles.filters.emptyTitle')
                  : t('articles.public.emptyTitle')}
            </h3>

            <p>
              {isSearchActive
                ? t('articles.search.emptyMessage', {
                    search: searchTerm,
                  })
                : isCategoryActive && selectedCategory
                  ? t('articles.filters.emptyMessage', {
                      category: t(`categories.names.${selectedCategory.slug}`, {
                        defaultValue: selectedCategory.name,
                      }),
                    })
                  : t('articles.public.emptyMessage')}
            </p>
          </div>
        )}

        {!isLoading && !error && articles.length > 0 && (
          <>
            <div className="public-articles-list">
              {articles.map((article, articleIndex) => {
                const layout =
                  articleIndex < 3
                    ? EDITORIAL_RHYTHM[articleIndex]
                    : (EDITORIAL_LAYOUTS[article.slug] ??
                      EDITORIAL_RHYTHM[articleIndex % EDITORIAL_RHYTHM.length])
                const showCover =
                  article.cover_image_url &&
                  !['typographic', 'quote'].includes(layout)
                const authorName =
                  [article.author?.name, article.author?.surname]
                    .filter(Boolean)
                    .join(' ') || article.author?.username

                const authorUsername = article.author?.username

                const articleCategories =
                  article.article_categories
                    ?.map((relation) => relation.category)
                    .filter(Boolean) ?? []

                const articlePath = authorUsername
                  ? `/${authorUsername}/${article.slug}`
                  : null

                return (
                  <article
                    className="public-article-card"
                    data-layout={layout}
                    key={article.id}
                  >
                    {showCover && (
                      <div className="public-article-card__cover">
                        {articlePath ? (
                          <Link to={articlePath}>
                            <ResponsiveImage
                              article={article}
                              sizes={
                                layout === 'panorama'
                                  ? '(max-width: 700px) 100vw, 1200px'
                                  : '(max-width: 700px) 100vw, 600px'
                              }
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
                      {articleCategories.length > 0 && (
                        <span>
                          {articleCategories.map((category, index) => (
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
                      {articlePath ? (
                        <Link to={articlePath}>{article.title}</Link>
                      ) : (
                        article.title
                      )}
                    </h3>

                    {getArticlePreview(article) &&
                      (layout === 'quote' ? (
                        <blockquote className="public-article-card__pullquote">
                          <p>{getArticlePreview(article)}</p>
                        </blockquote>
                      ) : (
                        <p className="public-article-card__excerpt">
                          {getArticlePreview(article)}
                        </p>
                      ))}

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
                        <span className="public-article-card__author">
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
      </section>
    </main>
  )
}

export default HomePage
