import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getCategories } from '../../services/categories.service.js'

const MAX_COVER_SIZE_BYTES = 6 * 1024 * 1024

const ALLOWED_COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function ArticleForm({
  initialValues,
  initialPublicationMode = 'now',
  initialStatus = 'draft',
  initialCoverImageUrl = null,
  mode = 'create',
  onSubmit,
  onSuccess,
}) {
  const { t } = useTranslation()

  const [formData, setFormData] = useState(initialValues)

  const [publicationMode, setPublicationMode] = useState(initialPublicationMode)

  const [coverFile, setCoverFile] = useState(null)
  const [coverError, setCoverError] = useState(null)

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

    if (name === 'publicationDate') {
      if (!value) {
        setPublicationMode('now')
      } else {
        const publicationTime = new Date(value).getTime()

        setPublicationMode(publicationTime > Date.now() ? 'scheduled' : 'now')
      }
    }

    setSubmitError(false)
  }

  function handleCoverChange(event) {
    const [file] = event.target.files ?? []

    setCoverError(null)
    setSubmitError(false)

    if (!file) {
      setCoverFile(null)

      return
    }

    if (!ALLOWED_COVER_TYPES.has(file.type)) {
      setCoverFile(null)
      setCoverError(t('articles.form.cover.invalidType'))

      event.target.value = ''

      return
    }

    if (file.size > MAX_COVER_SIZE_BYTES) {
      setCoverFile(null)
      setCoverError(t('articles.form.cover.tooLarge'))

      event.target.value = ''

      return
    }

    setCoverFile(file)
  }

  function handleCategoryChange(event) {
    const { checked, value } = event.target

    setFormData((current) => {
      const categoryIds = checked
        ? [...current.categoryIds, value]
        : current.categoryIds.filter((categoryId) => categoryId !== value)

      return {
        ...current,
        categoryIds,
      }
    })

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

    if (status === 'published') {
      if (formData.publicationDate) {
        article.publishedAt = new Date(formData.publicationDate).toISOString()
      } else if (mode === 'edit') {
        article.publishedAt = null
      }
    }

    try {
      const result = await onSubmit(article, coverFile)

      setIsSubmitting(false)
      setSubmissionType(null)

      onSuccess?.(result)
    } catch (error) {
      console.error('Unable to save article:', error)

      setSubmitError(true)
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

  function getDraftActionLabel() {
    if (isSubmitting && submissionType === 'draft') {
      return t('articles.form.actions.savingDraft')
    }

    if (mode === 'edit' && initialStatus === 'published') {
      return t('articles.form.actions.moveToDraft')
    }

    return t('articles.form.actions.saveDraft')
  }

  function getPublishActionLabel() {
    if (isSubmitting && submissionType === 'published') {
      return t('articles.form.actions.saving')
    }

    if (mode === 'edit' && initialStatus === 'published') {
      if (publicationMode === 'scheduled') {
        return t('articles.form.actions.updateSchedule')
      }

      return t('articles.form.actions.updatePublished')
    }

    if (publicationMode === 'scheduled') {
      return t('articles.form.actions.schedule')
    }

    return t('articles.form.actions.publish')
  }

  return (
    <>
      {submitError && (
        <p className="auth-message auth-message--error" role="alert">
          {t('articles.form.submitError')}
        </p>
      )}

      <form className="article-editor-form" onSubmit={handleSubmit}>
        <div className="article-editor-field">
          <label htmlFor="title">{t('articles.form.fields.title')}</label>

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
          <label htmlFor="excerpt">{t('articles.form.fields.excerpt')}</label>

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
          <label htmlFor="cover">{t('articles.form.fields.cover')}</label>

          {initialCoverImageUrl && !coverFile && (
            <div className="article-editor-cover-current">
              <img
                src={initialCoverImageUrl}
                alt={t('articles.form.cover.currentAlt')}
              />

              <p>{t('articles.form.cover.current')}</p>
            </div>
          )}

          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverChange}
            disabled={isSubmitting}
            aria-describedby={
              coverError ? 'article-cover-error' : 'article-cover-help'
            }
          />

          <p id="article-cover-help" className="article-editor-help">
            {t('articles.form.cover.help')}
          </p>

          {coverFile && (
            <p className="article-editor-help">
              {t('articles.form.cover.selected', {
                filename: coverFile.name,
              })}
            </p>
          )}

          {coverError && (
            <p
              id="article-cover-error"
              className="auth-message auth-message--error"
              role="alert"
            >
              {coverError}
            </p>
          )}
        </div>

        <div className="article-editor-field">
          <label htmlFor="content">{t('articles.form.fields.content')}</label>

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
              {t('articles.form.fields.language')}
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
              {t('articles.form.fields.publicationDate')}
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
                  ? t('articles.form.publication.scheduled')
                  : t('articles.form.publication.selected')
                : t('articles.form.publication.now')}
            </p>
          </div>
        </div>

        <fieldset className="article-editor-categories">
          <legend>{t('articles.form.fields.categories')}</legend>

          {categoriesLoading && <p>{t('articles.form.categories.loading')}</p>}

          {!categoriesLoading && categoriesError && (
            <div>
              <p className="auth-message auth-message--error" role="alert">
                {t('articles.form.categories.error')}
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
              <p>{t('articles.form.categories.empty')}</p>
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

                  <span>
                    {t(`categories.names.${category.slug}`, {
                      defaultValue: category.name,
                    })}
                  </span>
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
            {getDraftActionLabel()}
          </button>

          <button
            className="article-editor-publish"
            type="submit"
            disabled={isSubmitting || formData.title.trim().length === 0}
          >
            {getPublishActionLabel()}
          </button>
        </footer>
      </form>
    </>
  )
}

export default ArticleForm
