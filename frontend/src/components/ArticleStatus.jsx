import { useTranslation } from 'react-i18next'

function getArticleStatus(article) {
  if (article.status === 'draft') {
    return 'draft'
  }

  if (
    article.status === 'published' &&
    article.published_at &&
    new Date(article.published_at).getTime() > Date.now()
  ) {
    return 'scheduled'
  }

  return 'published'
}

function ArticleStatus({ article }) {
  const { t } = useTranslation()

  const status = getArticleStatus(article)

  return (
    <span className={`article-status article-status--${status}`}>
      {t(`articles.status.${status}`)}
    </span>
  )
}

export default ArticleStatus
