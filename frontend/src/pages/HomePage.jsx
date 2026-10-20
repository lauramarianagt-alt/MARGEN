import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getPublicArticles } from '../services/articles.service.js'
import { getCategories } from '../services/categories.service.js'

const PAGE_SIZE = 10

function HomePage() {
  const { i18n, t } = useTranslation()

  const [articles, setArticles] = useState([])

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [page, setPage] = useState(1)

  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchValidationError, setSearchValidationError] = useState(null)

  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('')
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(null)
  const [categoriesRetryKey, setCategoriesRetryKey] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const isSearchActive = searchTerm.length >= 2
  const isCategoryActive = activeCategory.length > 0

  const selectedCategory =
    categories.find((category) => category.slug === activeCategory) ?? null

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

    getPublicArticles({
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

  function handleSearchInputChange(event) {
    setSearchInput(event.target.value)

    if (searchValidationError) {
      setSearchValidationError(null)
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault()

    const nextSearchTerm = searchInput.trim()

    if (nextSearchTerm.length === 1) {
      setSearchValidationError(t('articles.search.minLength'))

      return
    }

    setSearchValidationError(null)
    setError(null)
    setIsLoading(true)

    setPage(1)

    if (nextSearchTerm === searchTerm && page === 1) {
      setRetryKey((current) => current + 1)

      return
    }

    setSearchTerm(nextSearchTerm)
  }

  function handleClearSearch() {
    setSearchInput('')
    setSearchValidationError(null)
    setError(null)
    setIsLoading(true)

    setPage(1)

    if (searchTerm === '' && page === 1) {
      setRetryKey((current) => current + 1)

      return
    }

    setSearchTerm('')
  }

  function handleCategoryChange(categorySlug) {
    if (categorySlug === activeCategory) {
      return
    }

    setActiveCategory(categorySlug)
    setPage(1)
    setError(null)
    setIsLoading(true)
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

  return (
    <main className="page public-home">
      <section className="public-home__hero">
        <p className="page-eyebrow">{t('articles.public.eyebrow')}</p>

        <h1>{t('articles.public.heroTitle')}</h1>

        <p className="public-home__intro">{t('articles.public.heroIntro')}</p>

        <form
          className="public-search"
          role="search"
          onSubmit={handleSearchSubmit}
        >
          <label className="public-search__label" htmlFor="article-search">
            {t('articles.search.label')}
          </label>

          <div className="public-search__controls">
            <input
              id="article-search"
              name="search"
              type="search"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder={t('articles.search.placeholder')}
              maxLength={100}
              aria-describedby={
                searchValidationError ? 'article-search-error' : undefined
              }
            />

            <button type="submit">{t('articles.search.submit')}</button>

            {isSearchActive && (
              <button type="button" onClick={handleClearSearch}>
                {t('articles.search.clear')}
              </button>
            )}
          </div>

          {searchValidationError && (
            <p
              id="article-search-error"
              className="auth-message auth-message--error"
              role="alert"
            >
              {searchValidationError}
            </p>
          )}
        </form>

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

                {categories.map((category) => {
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
                      {category.name}
                    </button>
                  )
                })}
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
                : t('articles.public.latest')}
            </h2>

            {isSearchActive && (
              <p>
                {t('articles.search.resultCount', {
                  count: pagination.total,
                  search: searchTerm,
                })}
              </p>
            )}

            {isCategoryActive && selectedCategory && (
              <p>
                {t('articles.filters.active', {
                  category: selectedCategory.name,
                })}
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
                      category: selectedCategory.name,
                    })
                  : t('articles.public.emptyMessage')}
            </p>
          </div>
        )}

        {!isLoading && !error && articles.length > 0 && (
          <>
            <div className="public-articles-list">
              {articles.map((article) => {
                const authorName =
                  [article.author?.name, article.author?.surname]
                    .filter(Boolean)
                    .join(' ') || article.author?.username

                const authorUsername = article.author?.username

                const articleCategories =
                  article.article_categories
                    ?.map((relation) => relation.category)
                    .filter(Boolean) ?? []

                return (
                  <article className="public-article-card" key={article.id}>
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
                      {authorUsername ? (
                        <Link to={`/${authorUsername}/${article.slug}`}>
                          {article.title}
                        </Link>
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

                      {authorUsername && (
                        <Link
                          className="public-article-card__read"
                          to={`/${authorUsername}/${article.slug}`}
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
