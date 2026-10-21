import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Action({ isAuthenticated, isAuthLoading, children, ...props }) {
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <Link className="article-action" to="/login">
        {children}
      </Link>
    )
  }

  return (
    <button className="article-action" type="button" {...props}>
      {children}
    </button>
  )
}

export default function ArticleActions({
  isAuthenticated,
  isAuthLoading,
  isReady,
  isOwnArticle,
  isFavorite,
  isLiked,
  likeCount,
  isFavoriteLoading,
  isLikeLoading,
  onFavorite,
  onLike,
}) {
  const { t } = useTranslation()
  const common = { isAuthenticated, isAuthLoading }

  return (
    <div
      className="article-actions"
      role="group"
      aria-label={t('social.title')}
    >
      <Action
        {...common}
        aria-pressed={isFavorite}
        aria-busy={isFavoriteLoading}
        disabled={!isReady || isAuthLoading || isFavoriteLoading}
        onClick={onFavorite}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isFavorite ? 'currentColor' : 'none'}
          aria-hidden="true"
        >
          <path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3Z" />
        </svg>
        <span>
          {t(isFavorite ? 'social.favorite.remove' : 'social.favorite.add')}
        </span>
      </Action>
      <Action
        {...common}
        aria-pressed={isLiked}
        aria-label={`${t('social.like.label')} (${likeCount})`}
        aria-busy={isLikeLoading}
        aria-describedby={isOwnArticle ? 'article-own-note' : undefined}
        disabled={!isReady || isAuthLoading || isLikeLoading || isOwnArticle}
        onClick={onLike}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          aria-hidden="true"
        >
          <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
        </svg>
        <span>{t('social.like.label')}</span>
        <span className="article-action__count">{likeCount}</span>
      </Action>
    </div>
  )
}
