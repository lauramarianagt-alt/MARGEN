import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ArticleStatus from '../components/ArticleStatus.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { deleteArticle, getMyArticles } from '../services/articles.service.js'
import { getFavorites, removeFavorite } from '../services/social.service.js'

const PAGE_SIZE = 10

function isPubliclyAvailable(article) {
  if (article.status !== 'published' || !article.published_at) {
    return false
  }

  return new Date(article.published_at).getTime() <= Date.now()
}

function MyArticlesPage() {
  const { i18n, t } = useTranslation()
  const { profile } = useAuth()

  const [activeSection, setActiveSection] = useState('articles')

  const [articles, setArticles] = useState([])

  const [articlesPagination, setArticlesPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [articlesPage, setArticlesPage] = useState(1)
  const [articlesRetryKey, setArticlesRetryKey] = useState(0)

  const [isArticlesLoading, setIsArticlesLoading] = useState(true)
  const [articlesError, setArticlesError] = useState(null)

  const [favorites, setFavorites] = useState([])

  const [favoritesPagination, setFavoritesPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  })

  const [favoritesPage, setFavoritesPage] = useState(1)
  const [favoritesRetryKey, setFavoritesRetryKey] = useState(0)

  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false)
  const [favoritesError, setFavoritesError] = useState(null)
  const [favoriteActionError, setFavoriteActionError] = useState(null)
  const [removingFavoriteId, setRemovingFavoriteId] = useState(null)

  const [articleToDelete, setArticleToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (activeSection !== 'articles') {
      return undefined
    }

    let cancelled = false

    getMyArticles({
      page: articlesPage,
      limit: PAGE_SIZE,
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        setArticles(response.articles ?? [])

        setArticlesPagination(
          response.pagination ?? {
            page: articlesPage,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          },
        )

        setArticlesError(null)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load articles:', loadError)

        setArticlesError(t('articles.my.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsArticlesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeSection, articlesPage, articlesRetryKey, t])

  useEffect(() => {
    if (activeSection !== 'favorites') {
      return undefined
    }

    let cancelled = false

    getFavorites({
      page: favoritesPage,
      limit: PAGE_SIZE,
    })
      .then((response) => {
        if (cancelled) {
          return
        }

        setFavorites(response.favorites ?? [])

        setFavoritesPagination(
          response.pagination ?? {
            page: favoritesPage,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 0,
          },
        )

        setFavoritesError(null)
        setFavoriteActionError(null)
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load favorites:', loadError)

        setFavoritesError(t('favorites.loadError'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsFavoritesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeSection, favoritesPage, favoritesRetryKey, t])

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

  function handleSectionChange(section) {
    if (section === activeSection) {
      return
    }

    if (section === 'articles') {
      setIsArticlesLoading(true)
      setArticlesError(null)
    } else {
      setIsFavoritesLoading(true)
      setFavoritesError(null)
    }

    setActiveSection(section)
  }

  function handleArticlesPreviousPage() {
    setIsArticlesLoading(true)
    setArticlesError(null)

    setArticlesPage((current) => Math.max(1, current - 1))
  }

  function handleArticlesNextPage() {
    setIsArticlesLoading(true)
    setArticlesError(null)

    setArticlesPage((current) =>
      Math.min(articlesPagination.totalPages, current + 1),
    )
  }

  function handleArticlesRetry() {
    setIsArticlesLoading(true)
    setArticlesError(null)

    setArticlesRetryKey((current) => current + 1)
  }

  function handleFavoritesPreviousPage() {
    setIsFavoritesLoading(true)
    setFavoritesError(null)

    setFavoritesPage((current) => Math.max(1, current - 1))
  }

  function handleFavoritesNextPage() {
    setIsFavoritesLoading(true)
    setFavoritesError(null)

    setFavoritesPage((current) =>
      Math.min(favoritesPagination.totalPages, current + 1),
    )
  }

  function handleFavoritesRetry() {
    setIsFavoritesLoading(true)
    setFavoritesError(null)

    setFavoritesRetryKey((current) => current + 1)
  }

  function handleDeleteRequest(article) {
    setArticleToDelete(article)
    setDeleteError(null)
  }

  function handleCancelDelete() {
    if (isDeleting) {
      return
    }

    setArticleToDelete(null)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    if (!articleToDelete || isDeleting) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteArticle(articleToDelete.id)

      const deletingLastArticleOnPage =
        articles.length === 1 && articlesPage > 1

      setArticleToDelete(null)
      setIsArticlesLoading(true)

      if (deletingLastArticleOnPage) {
        setArticlesPage((current) => Math.max(1, current - 1))
      } else {
        setArticlesRetryKey((current) => current + 1)
      }
    } catch (deleteRequestError) {
      console.error('Unable to delete article:', deleteRequestError)

      setDeleteError(t('articles.delete.error'))
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleRemoveFavorite(articleId) {
    if (removingFavoriteId) {
      return
    }

    setRemovingFavoriteId(articleId)
    setFavoriteActionError(null)

    try {
      await removeFavorite(articleId)

      const removingLastFavoriteOnPage =
        favorites.length === 1 && favoritesPage > 1

      setIsFavoritesLoading(true)

      if (removingLastFavoriteOnPage) {
        setFavoritesPage((current) => Math.max(1, current - 1))
      } else {
        setFavoritesRetryKey((current) => current + 1)
      }
    } catch (removeError) {
      console.error('Unable to remove favorite:', removeError)

      setFavoriteActionError(t('favorites.removeError'))
    } finally {
      setRemovingFavoriteId(null)
    }
  }

  function renderArticles() {
    return (
      <>
        <header className="articles-page__header">
          <div>
            <h2>{t('articles.my.title')}</h2>
          </div>

          <div className="articles-page__actions">
            <p className="articles-count">
              {t('articles.my.count', {
                count: articlesPagination.total,
              })}
            </p>

            <Link className="articles-create-link" to="/dashboard/articles/new">
              {t('articles.my.create')}
            </Link>
          </div>
        </header>

        {isArticlesLoading && <p>{t('articles.my.loading')}</p>}

        {!isArticlesLoading && articlesError && (
          <div>
            <p className="auth-message auth-message--error" role="alert">
              {articlesError}
            </p>

            <button
              className="navigation-button"
              type="button"
              onClick={handleArticlesRetry}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {!isArticlesLoading && !articlesError && articles.length === 0 && (
          <section className="articles-empty">
            <h2>{t('articles.my.emptyTitle')}</h2>

            <p>{t('articles.my.emptyMessage')}</p>
          </section>
        )}

        {!isArticlesLoading && !articlesError && articles.length > 0 && (
          <>
            <div className="articles-list">
              {articles.map((article) => {
                const date = article.published_at ?? article.updated_at

                return (
                  <article className="article-row" key={article.id}>
                    {article.cover_image_url && (
                      <div className="article-row__cover">
                        <img
                          src={article.cover_image_url}
                          alt=""
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="article-row__main">
                      <ArticleStatus article={article} />

                      <h2>{article.title}</h2>

                      {article.excerpt && (
                        <p className="article-row__excerpt">
                          {article.excerpt}
                        </p>
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

                        <button
                          className="article-row__delete"
                          type="button"
                          onClick={() => handleDeleteRequest(article)}
                        >
                          {t('articles.my.delete')}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {articlesPagination.totalPages > 1 && (
              <nav
                className="articles-pagination"
                aria-label={t('articles.pagination.label')}
              >
                <button
                  type="button"
                  onClick={handleArticlesPreviousPage}
                  disabled={articlesPage <= 1}
                >
                  {t('articles.pagination.previous')}
                </button>

                <span>
                  {t('articles.pagination.page', {
                    page: articlesPagination.page,
                    totalPages: articlesPagination.totalPages,
                  })}
                </span>

                <button
                  type="button"
                  onClick={handleArticlesNextPage}
                  disabled={articlesPage >= articlesPagination.totalPages}
                >
                  {t('articles.pagination.next')}
                </button>
              </nav>
            )}
          </>
        )}
      </>
    )
  }

  function renderFavorites() {
    return (
      <>
        <header className="articles-page__header">
          <div>
            <h2>{t('favorites.title')}</h2>
          </div>

          <div className="articles-page__actions">
            <p className="articles-count">
              {t('favorites.count', {
                count: favoritesPagination.total,
              })}
            </p>
          </div>
        </header>

        {isFavoritesLoading && <p>{t('favorites.loading')}</p>}

        {!isFavoritesLoading && favoritesError && (
          <div>
            <p className="auth-message auth-message--error" role="alert">
              {favoritesError}
            </p>

            <button
              className="navigation-button"
              type="button"
              onClick={handleFavoritesRetry}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {favoriteActionError && (
          <p className="auth-message auth-message--error" role="alert">
            {favoriteActionError}
          </p>
        )}

        {!isFavoritesLoading && !favoritesError && favorites.length === 0 && (
          <section className="articles-empty">
            <h2>{t('favorites.emptyTitle')}</h2>

            <p>{t('favorites.emptyMessage')}</p>
          </section>
        )}

        {!isFavoritesLoading && !favoritesError && favorites.length > 0 && (
          <>
            <div className="articles-list">
              {favorites.map((favorite) => {
                const article = favorite.article

                if (!article) {
                  return (
                    <article className="article-row" key={favorite.article_id}>
                      <div className="article-row__main">
                        <p className="page-eyebrow">
                          {t('favorites.unavailable')}
                        </p>

                        <p className="article-row__excerpt">
                          {t('favorites.unavailableMessage')}
                        </p>
                      </div>

                      <div className="article-row__meta">
                        <button
                          className="article-row__delete"
                          type="button"
                          disabled={removingFavoriteId === favorite.article_id}
                          onClick={() =>
                            void handleRemoveFavorite(favorite.article_id)
                          }
                        >
                          {t('favorites.remove')}
                        </button>
                      </div>
                    </article>
                  )
                }

                const authorName =
                  [article.author?.name, article.author?.surname]
                    .filter(Boolean)
                    .join(' ') || article.author?.username

                const categories =
                  article.article_categories
                    ?.map((relation) => relation.category)
                    .filter(Boolean) ?? []

                const publicArticle = isPubliclyAvailable(article)

                const articlePath =
                  publicArticle && article.author?.username
                    ? `/${article.author.username}/${article.slug}`
                    : `/dashboard/articles/${article.id}/edit`

                const date =
                  article.published_at ??
                  article.updated_at ??
                  favorite.created_at

                return (
                  <article className="article-row" key={favorite.article_id}>
                    {article.cover_image_url && (
                      <Link
                        className="article-row__cover"
                        to={articlePath}
                        aria-label={article.title}
                      >
                        <img
                          src={article.cover_image_url}
                          alt=""
                          loading="lazy"
                        />
                      </Link>
                    )}

                    <div className="article-row__main">
                      {categories.length > 0 && (
                        <p className="page-eyebrow">
                          {categories
                            .map((category) => category.name)
                            .join(' · ')}
                        </p>
                      )}

                      <h2>
                        <Link
                          className="favorite-article-link"
                          to={articlePath}
                        >
                          {article.title}
                        </Link>
                      </h2>

                      {article.excerpt && (
                        <p className="article-row__excerpt">
                          {article.excerpt}
                        </p>
                      )}

                      {authorName && (
                        <p className="favorite-article-author">
                          {t('articles.public.by', {
                            author: authorName,
                          })}
                        </p>
                      )}
                    </div>

                    <div className="article-row__meta">
                      {date && <time dateTime={date}>{formatDate(date)}</time>}

                      <span>{article.language}</span>

                      <div className="article-row__actions">
                        <Link className="article-row__edit" to={articlePath}>
                          {publicArticle
                            ? t('favorites.read')
                            : t('favorites.edit')}
                        </Link>

                        <button
                          className="article-row__delete"
                          type="button"
                          disabled={removingFavoriteId === article.id}
                          onClick={() => void handleRemoveFavorite(article.id)}
                        >
                          {t('favorites.remove')}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {favoritesPagination.totalPages > 1 && (
              <nav
                className="articles-pagination"
                aria-label={t('favorites.paginationLabel')}
              >
                <button
                  type="button"
                  onClick={handleFavoritesPreviousPage}
                  disabled={favoritesPage <= 1}
                >
                  {t('articles.pagination.previous')}
                </button>

                <span>
                  {t('articles.pagination.page', {
                    page: favoritesPagination.page,
                    totalPages: favoritesPagination.totalPages,
                  })}
                </span>

                <button
                  type="button"
                  onClick={handleFavoritesNextPage}
                  disabled={favoritesPage >= favoritesPagination.totalPages}
                >
                  {t('articles.pagination.next')}
                </button>
              </nav>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <>
      <main className="page dashboard-page articles-page">
        <section className="dashboard-overview">
          <p className="page-eyebrow">{t('dashboard.title')}</p>

          <h1>
            {t('dashboard.welcome', {
              name: profile.name,
            })}
          </h1>

          <p className="dashboard-username">
            {t('dashboard.username', {
              username: profile.username,
            })}
          </p>
        </section>

        <nav
          className="dashboard-sections"
          aria-label={t('dashboard.sections')}
        >
          <button
            type="button"
            className="dashboard-section-button"
            aria-pressed={activeSection === 'articles'}
            onClick={() => handleSectionChange('articles')}
          >
            {t('articles.my.title')}
          </button>

          <button
            type="button"
            className="dashboard-section-button"
            aria-pressed={activeSection === 'favorites'}
            onClick={() => handleSectionChange('favorites')}
          >
            {t('favorites.title')}
          </button>
        </nav>

        {activeSection === 'articles' ? renderArticles() : renderFavorites()}
      </main>

      <ConfirmDialog
        open={Boolean(articleToDelete)}
        title={t('articles.delete.title')}
        description={t('articles.delete.description')}
        itemName={articleToDelete?.title}
        confirmLabel={t('articles.delete.confirm')}
        cancelLabel={t('articles.delete.cancel')}
        processingLabel={t('articles.delete.deleting')}
        isProcessing={isDeleting}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={handleCancelDelete}
      />
    </>
  )
}

export default MyArticlesPage
