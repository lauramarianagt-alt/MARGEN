import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ArticleForm from '../components/articles/ArticleForm.jsx'
import { ApiError } from '../services/api.js'
import { getMyArticle, updateArticle } from '../services/articles.service.js'

function toDateTimeLocal(dateValue) {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)

  const timezoneOffset = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function getCategoryIds(article) {
  return (article.article_categories ?? [])
    .map((relation) => relation.category?.id)
    .filter(Boolean)
}

function EditArticlePage() {
  const { t } = useTranslation()
  const { id: articleId } = useParams()
  const navigate = useNavigate()

  const [editorState, setEditorState] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    getMyArticle(articleId)
      .then((response) => {
        if (cancelled) {
          return
        }

        const article = response.article

        if (!article) {
          throw new Error('Article response is empty')
        }

        const publicationDate = toDateTimeLocal(article.published_at)

        const publicationMode =
          article.status === 'published' &&
          article.published_at &&
          new Date(article.published_at).getTime() > Date.now()
            ? 'scheduled'
            : 'now'

        setEditorState({
          initialValues: {
            title: article.title ?? '',
            excerpt: article.excerpt ?? '',
            content: article.content ?? '',
            language: article.language ?? 'es',
            categoryIds: getCategoryIds(article),
            publicationDate,
          },
          initialStatus: article.status,
          initialPublicationMode: publicationMode,
        })

        setLoadError(null)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load article:', error)

        const notFound = error instanceof ApiError && error.status === 404

        setLoadError({
          message: notFound
            ? t('articles.edit.notFound')
            : t('articles.edit.loadError'),
          canRetry: !notFound,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [articleId, retryKey, t])

  function handleRetry() {
    setIsLoading(true)
    setLoadError(null)

    setRetryKey((current) => current + 1)
  }

  async function handleUpdate(article) {
    return updateArticle(articleId, article)
  }

  function handleSuccess() {
    navigate('/dashboard/articles', {
      replace: true,
    })
  }

  if (isLoading) {
    return (
      <main className="page article-editor-page">
        <p>{t('articles.edit.loading')}</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="page article-editor-page">
        <p className="auth-message auth-message--error" role="alert">
          {loadError.message}
        </p>

        <div className="article-load-error-actions">
          {loadError.canRetry && (
            <button
              className="navigation-button"
              type="button"
              onClick={handleRetry}
            >
              {t('common.retry')}
            </button>
          )}

          <Link className="article-editor-cancel" to="/dashboard/articles">
            {t('articles.edit.back')}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page article-editor-page">
      <header className="article-editor-header">
        <div>
          <p className="page-eyebrow">{t('articles.edit.eyebrow')}</p>

          <h1>{t('articles.edit.title')}</h1>
        </div>

        <Link className="article-editor-cancel" to="/dashboard/articles">
          {t('articles.edit.cancel')}
        </Link>
      </header>

      <ArticleForm
        initialValues={editorState.initialValues}
        initialPublicationMode={editorState.initialPublicationMode}
        initialStatus={editorState.initialStatus}
        mode="edit"
        onSubmit={handleUpdate}
        onSuccess={handleSuccess}
      />
    </main>
  )
}

export default EditArticlePage
