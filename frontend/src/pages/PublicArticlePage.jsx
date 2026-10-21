import ArticleContent from '../components/articles/ArticleContent.jsx'
import PublicGallery from '../components/gallery/PublicGallery.jsx'
import ResponsiveImage from '../components/ResponsiveImage.jsx'
import { useEffect, useState } from 'react'
import { usePageMetadata } from '../hooks/usePageMetadata.js'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'
import { ApiError } from '../services/api.js'
import { getPublicArticle } from '../services/articles.service.js'
import {
  addArticleLike,
  addComment,
  addFavorite,
  deleteComment,
  getArticleComments,
  getArticleLikes,
  getArticleLikeState,
  getFavoriteState,
  removeArticleLike,
  removeFavorite,
} from '../services/social.service.js'

function PublicArticlePage() {
  const { username, slug } = useParams()
  const { i18n, t } = useTranslation()

  const { user, profile, isAuthenticated, isLoading: isAuthLoading } = useAuth()

  const [article, setArticle] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const [likeCount, setLikeCount] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const [comments, setComments] = useState([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentsPagination, setCommentsPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0,
  })
  const [commentsRetryKey, setCommentsRetryKey] = useState(0)
  const [commentContent, setCommentContent] = useState('')

  const [isSocialLoading, setIsSocialLoading] = useState(false)
  const [socialError, setSocialError] = useState(null)

  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState(null)

  usePageMetadata(article?.title, article?.excerpt)

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

  useEffect(() => {
    if (!article?.id) {
      return undefined
    }

    let cancelled = false

    async function loadPublicSocialData() {
      setIsSocialLoading(true)

      try {
        const [likesResponse, commentsResponse] = await Promise.all([
          getArticleLikes(article.id),
          getArticleComments(article.id, {
            page: commentsPagination.page,
            limit: commentsPagination.limit,
          }),
        ])

        if (cancelled) {
          return
        }

        setLikeCount(likesResponse.count)
        setComments(commentsResponse.comments)
        setCommentTotal(commentsResponse.pagination.total)
        setCommentsPagination((current) => ({
          ...current,
          totalPages: commentsResponse.pagination.totalPages,
        }))
        setSocialError(null)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        console.error('Unable to load article social data:', loadError)

        setSocialError(t('social.loadError'))
      } finally {
        if (!cancelled) {
          setIsSocialLoading(false)
        }
      }
    }

    loadPublicSocialData()

    return () => {
      cancelled = true
    }
  }, [
    article?.id,
    commentsPagination.page,
    commentsPagination.limit,
    commentsRetryKey,
    t,
  ])

  useEffect(() => {
    if (!article?.id || isAuthLoading) {
      return undefined
    }

    let cancelled = false

    async function loadPrivateSocialState() {
      if (!isAuthenticated) {
        setIsFavorite(false)
        setIsLiked(false)

        return
      }

      const currentUserId = user?.id ?? profile?.id ?? null
      const isOwnArticle = currentUserId === article.author_id

      try {
        const favoriteResponse = await getFavoriteState(article.id)

        if (cancelled) {
          return
        }

        setIsFavorite(favoriteResponse.isFavorite)

        if (isOwnArticle) {
          setIsLiked(false)

          return
        }

        const likeResponse = await getArticleLikeState(article.id)

        if (cancelled) {
          return
        }

        setIsLiked(likeResponse.isLiked)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        console.error('Unable to load private social state:', loadError)

        setSocialError(t('social.stateError'))
      }
    }

    loadPrivateSocialState()

    return () => {
      cancelled = true
    }
  }, [
    article?.id,
    article?.author_id,
    isAuthenticated,
    isAuthLoading,
    user?.id,
    profile?.id,
    t,
  ])

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

  async function handleFavorite() {
    if (!article || !isAuthenticated || isFavoriteLoading) {
      return
    }

    setIsFavoriteLoading(true)
    setSocialError(null)

    try {
      if (isFavorite) {
        await removeFavorite(article.id)
        setIsFavorite(false)
      } else {
        await addFavorite(article.id)
        setIsFavorite(true)
      }
    } catch (actionError) {
      console.error('Unable to update favorite:', actionError)

      setSocialError(t('social.favorite.error'))
    } finally {
      setIsFavoriteLoading(false)
    }
  }

  async function handleLike() {
    if (!article || !isAuthenticated || isLikeLoading) {
      return
    }

    setIsLikeLoading(true)
    setSocialError(null)

    try {
      const response = isLiked
        ? await removeArticleLike(article.id)
        : await addArticleLike(article.id)

      setIsLiked(!isLiked)
      setLikeCount(response.count)
    } catch (actionError) {
      console.error('Unable to update article like:', actionError)

      setSocialError(t('social.like.error'))
    } finally {
      setIsLikeLoading(false)
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault()

    if (!article || isCommentSubmitting) {
      return
    }

    const content = commentContent.trim()

    if (!content) {
      return
    }

    setIsCommentSubmitting(true)
    setSocialError(null)

    try {
      await addComment(article.id, content)

      setCommentsPagination((current) => ({
        ...current,
        page: 1,
      }))

      setCommentsRetryKey((current) => current + 1)
      setCommentContent('')
    } catch (actionError) {
      console.error('Unable to create comment:', actionError)

      setSocialError(t('social.comments.createError'))
    } finally {
      setIsCommentSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId) {
    if (deletingCommentId) {
      return
    }

    setDeletingCommentId(commentId)
    setSocialError(null)

    try {
      await deleteComment(commentId)

      if (comments.length === 1 && commentsPagination.page > 1) {
        setCommentsPagination((current) => ({
          ...current,
          page: Math.max(1, current.page - 1),
        }))
      }

      setCommentsRetryKey((current) => current + 1)
    } catch (actionError) {
      console.error('Unable to delete comment:', actionError)

      setSocialError(t('social.comments.deleteError'))
    } finally {
      setDeletingCommentId(null)
    }
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

  const authorUsername = article.author?.username

  const categories =
    article.article_categories
      ?.map((relation) => relation.category)
      .filter(Boolean) ?? []

  const currentUserId = user?.id ?? profile?.id ?? null

  const isOwnArticle =
    Boolean(currentUserId) && currentUserId === article.author_id

  return (
    <main className="page public-article-page">
      <article className="public-article">
        <header className="public-article__header">
          {categories.length > 0 && (
            <p className="public-article__categories">
              {categories.map((category, index) => (
                <span key={category.id}>
                  {index > 0 && ' · '}

                  <Link to={`/categories/${category.slug}`}>
                    {t(`categories.names.${category.slug}`, {
                      defaultValue: category.name,
                    })}
                  </Link>
                </span>
              ))}
            </p>
          )}

          <h1>{article.title}</h1>

          {article.excerpt && (
            <p className="public-article__excerpt">{article.excerpt}</p>
          )}

          <div className="public-article__meta">
            {authorUsername ? (
              <Link
                className="public-article__author"
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

            {article.published_at && (
              <time dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
            )}
          </div>
        </header>

        {article.cover_image_url && (
          <div className="public-article__cover">
            <ResponsiveImage article={article} alt={article.title} />
          </div>
        )}

        <ArticleContent content={article.content} />
        <PublicGallery id={article.id} />

        <section
          className="public-article__social"
          aria-label={t('social.title')}
        >
          <div className="public-article__social-actions">
            {isAuthenticated && (
              <button
                type="button"
                className="navigation-button"
                aria-pressed={isFavorite}
                disabled={isFavoriteLoading}
                onClick={handleFavorite}
              >
                {isFavorite
                  ? t('social.favorite.remove')
                  : t('social.favorite.add')}
              </button>
            )}

            <div className="public-article__like">
              {isAuthenticated && !isOwnArticle ? (
                <button
                  type="button"
                  className="navigation-button"
                  aria-pressed={isLiked}
                  disabled={isLikeLoading}
                  onClick={handleLike}
                >
                  {isLiked ? '♥' : '♡'} {t('social.like.label')}
                </button>
              ) : (
                <span>{t('social.like.label')}</span>
              )}

              <span>{likeCount}</span>
            </div>
          </div>

          {!isAuthenticated && !isAuthLoading && (
            <p>
              <Link to="/login">{t('social.loginPrompt')}</Link>
            </p>
          )}

          {isOwnArticle && <p>{t('social.ownArticle')}</p>}

          {socialError && (
            <p className="auth-message auth-message--error" role="alert">
              {socialError}
            </p>
          )}

          <section className="public-article__comments">
            <header>
              <h2>
                {t('social.comments.title')} ({commentTotal})
              </h2>
            </header>

            {isSocialLoading ? (
              <p>{t('social.comments.loading')}</p>
            ) : (
              <>
                {comments.length === 0 ? (
                  <p>{t('social.comments.empty')}</p>
                ) : (
                  <div className="public-article__comment-list">
                    {comments.map((comment) => {
                      const commentAuthorName =
                        [comment.author?.name, comment.author?.surname]
                          .filter(Boolean)
                          .join(' ') || comment.author?.username

                      const isOwnComment =
                        Boolean(currentUserId) &&
                        comment.author_id === currentUserId

                      return (
                        <article
                          className="public-article__comment"
                          key={comment.id}
                        >
                          <header>
                            {comment.author?.username ? (
                              <Link to={`/${comment.author.username}`}>
                                {commentAuthorName}
                              </Link>
                            ) : (
                              <strong>{commentAuthorName}</strong>
                            )}

                            <time dateTime={comment.created_at}>
                              {formatDate(comment.created_at)}
                            </time>
                          </header>

                          <p>{comment.content}</p>

                          {isOwnComment && (
                            <button
                              type="button"
                              className="navigation-button"
                              disabled={deletingCommentId === comment.id}
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              {t('social.comments.delete')}
                            </button>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}

                {commentsPagination.totalPages > 1 && (
                  <nav
                    className="articles-pagination"
                    aria-label={t('social.comments.paginationLabel')}
                  >
                    <button
                      type="button"
                      disabled={commentsPagination.page <= 1}
                      onClick={() =>
                        setCommentsPagination((current) => ({
                          ...current,
                          page: Math.max(1, current.page - 1),
                        }))
                      }
                    >
                      {t('articles.pagination.previous')}
                    </button>

                    <span>
                      {t('articles.pagination.page', {
                        page: commentsPagination.page,
                        totalPages: commentsPagination.totalPages,
                      })}
                    </span>

                    <button
                      type="button"
                      disabled={
                        commentsPagination.page >= commentsPagination.totalPages
                      }
                      onClick={() =>
                        setCommentsPagination((current) => ({
                          ...current,
                          page: Math.min(current.totalPages, current.page + 1),
                        }))
                      }
                    >
                      {t('articles.pagination.next')}
                    </button>
                  </nav>
                )}

                {isAuthenticated && !isOwnArticle && (
                  <form
                    className="public-article__comment-form"
                    onSubmit={handleCommentSubmit}
                  >
                    <label htmlFor="article-comment">
                      {t('social.comments.formLabel')}
                    </label>

                    <textarea
                      id="article-comment"
                      name="comment"
                      rows="5"
                      maxLength="2000"
                      value={commentContent}
                      onChange={(event) =>
                        setCommentContent(event.target.value)
                      }
                      placeholder={t('social.comments.placeholder')}
                    />

                    <div>
                      <span>{commentContent.length}/2000</span>

                      <button
                        type="submit"
                        className="navigation-button"
                        disabled={isCommentSubmitting || !commentContent.trim()}
                      >
                        {isCommentSubmitting
                          ? t('social.comments.publishing')
                          : t('social.comments.publish')}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </section>

        <footer className="public-article__footer">
          <Link to="/">← {t('articles.detail.back')}</Link>
        </footer>
      </article>
    </main>
  )
}

export default PublicArticlePage
