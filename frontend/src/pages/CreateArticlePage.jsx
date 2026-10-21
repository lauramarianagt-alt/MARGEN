import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ArticleForm from '../components/articles/ArticleForm.jsx'
import { createArticle } from '../services/articles.service.js'

function CreateArticlePage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()

  const initialLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es'

  const initialValues = {
    title: '',
    excerpt: '',
    content: '',
    language: initialLanguage,
    categoryIds: [],
    publicationDate: '',
  }

  async function handleCreate(article, coverFile) {
    return createArticle(article, coverFile)
  }

  function handleSuccess() {
    navigate('/dashboard/articles', {
      replace: true,
    })
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

      <p className="article-editor-help">{t('gallery.createHelp')}</p>
      <ArticleForm
        initialValues={initialValues}
        onSubmit={handleCreate}
        onSuccess={handleSuccess}
      />
    </main>
  )
}

export default CreateArticlePage
