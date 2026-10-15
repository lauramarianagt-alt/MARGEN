import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { createArticle } from '../services/articles.service.js'
import { getCategories } from '../services/categories.service.js'

function CreateArticlePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()

  const initialLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es'

  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    language: initialLanguage,
    categoryIds: [],
    publicationDate: '',
  })

  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState(false)
  const [categoriesRetryKey, setCategoriesRetryKey] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionType, setSubmissionType] = useState(null)
  const [submitError, setSubmitError] = useState(false)

  useEffect(() => {
    let cancelled = false

    getCategories()
      .then((response) => {
        if (cancelled) {
          return
        }

        setCategories(response)
        setCategoriesError(false)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        console.error('Unable to load categories:', error)
        setCategoriesError(true)
      })
      .finally(() => {
        if (!cancelled) {
          setCategoriesLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [categoriesRetryKey])

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    setSubmitError(false)
  }

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (name === 'publicationDate') {
      if (!value) {
        setPublicationMode('now')
      } else {
        const publicationTime = new Date(value).getTime()

        publicationTime(publicationTime > Date.now() ? 'scheduled' : 'now')
      }
    }

    setSubmitError(false)
  }

  function handleRetryCategories() {
    setCategoriesLoading(true)
    setCategoriesError(false)

    setCategoriesRetryKey((current) => current + 1)
  }

  async function submitArticle(status) {
    setIsSubmitting(true)
    setSubmissionType(status)
    setSubmitError(false)

    const article = {
      title: formData.title.trim(),
      excerpt: formData.excerpt.trim() || null,
      content: formData.content,
      language: formData.language,
      status,
      categoryIds: formData.categoryIds,
    }

    if (status === 'published' && formData.publicationDate) {
      article.publishedAt = new Date(formData.publicationDate).toISOString()
    }

    try {
      await createArticle(article)

      navigate('/dashboard/articles', {
        replace: true,
      })
    } catch (error) {
      console.error('Unable to create article:', error)
      setSubmitError(true)
    } finally {
      setIsSubmitting(false)
      setSubmissionType(null)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()

    void submitArticle('published')
  }

  function handleSaveDraft() {
    void submitArticle('draft')
  }

  return (
    <main className="page article-editor-page">
      <header className="article-editor-header">
        <div>
          <p className="page-eyebrow">{t('articles.create.eyebrow')}</p>

          <h1>{t('articles.create.title')}</h1>
        </div>

        <Link className="article-editor-cancel" to="/dashboard/articles">
          {t('articles.create.cancel')}
        </Link>
      </header>

      {submitError && (
        <p className="auth-message auth-message--error" role="alert">
          {t('articles.create.submitError')}
        </p>
      )}

      <form className="article-editor-form" onSubmit={handleSubmit}>
        <div className="article-editor-field">
          <label htmlFor="title">{t('articles.create.fields.title')}</label>

          <input
            id="title"
            name="title"
            type="text"
            maxLength="200"
            value={formData.title}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="article-editor-field">
          <label htmlFor="excerpt">{t('articles.create.fields.excerpt')}</label>

          <textarea
            id="excerpt"
            name="excerpt"
            rows="3"
            maxLength="600"
            value={formData.excerpt}
            onChange={handleChange}
            disabled={isSubmitting}
          />

          <span className="article-editor-counter">
            {formData.excerpt.length}/600
          </span>
        </div>

        <div className="article-editor-field">
          <label htmlFor="content">{t('articles.create.fields.content')}</label>

          <textarea
            id="content"
            name="content"
            rows="14"
            maxLength="100000"
            value={formData.content}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className="article-editor-grid">
          <div className="article-editor-field">
            <label htmlFor="language">
              {t('articles.create.fields.language')}
            </label>

            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="es">{t('language.es')}</option>

              <option value="en">{t('language.en')}</option>
            </select>
          </div>

          <div className="article-editor-field">
            <label htmlFor="publicationDate">
              {t('articles.create.fields.publicationDate')}
            </label>

            <input
              id="publicationDate"
              name="publicationDate"
              type="datetime-local"
              value={formData.publicationDate}
              onChange={handleChange}
              disabled={isSubmitting}
            />

            <p className="article-editor-help">
              {formData.publicationDate
                ? publicationMode === 'scheduled'
                  ? t('articles.create.publication.scheduled')
                  : t('articles.create.publication.selected')
                : t('articles.create.publication.now')}
            </p>
          </div>
        </div>

        <fieldset className="article-editor-categories">
          <legend>{t('articles.create.fields.categories')}</legend>

          {categoriesLoading && (
            <p>{t('articles.create.categories.loading')}</p>
          )}

          {!categoriesLoading && categoriesError && (
            <div>
              <p className="auth-message auth-message--error" role="alert">
                {t('articles.create.categories.error')}
              </p>

              <button
                className="navigation-button"
                type="button"
                onClick={handleRetryCategories}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!categoriesLoading &&
            !categoriesError &&
            categories.length === 0 && (
              <p>{t('articles.create.categories.empty')}</p>
            )}

          {!categoriesLoading && !categoriesError && categories.length > 0 && (
            <div className="article-editor-category-list">
              {categories.map((category) => (
                <label className="article-editor-category" key={category.id}>
                  <input
                    type="checkbox"
                    value={category.id}
                    checked={formData.categoryIds.includes(category.id)}
                    onChange={handleCategoryChange}
                    disabled={isSubmitting}
                  />

                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <footer className="article-editor-actions">
          <button
            className="article-editor-draft"
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting || formData.title.trim().length === 0}
          >
            {isSubmitting && submissionType === 'draft'
              ? t('articles.create.actions.savingDraft')
              : t('articles.create.actions.saveDraft')}
          </button>

          <button
            className="article-editor-publish"
            type="submit"
            disabled={isSubmitting || formData.title.trim().length === 0}
          >
            {isSubmitting && submissionType === 'published'
              ? t('articles.create.actions.publishing')
              : publicationMode === 'scheduled'
                ? t('articles.create.actions.schedule')
                : t('articles.create.actions.publish')}
          </button>
        </footer>
      </form>
    </main>
  )
}

export default CreateArticlePage
