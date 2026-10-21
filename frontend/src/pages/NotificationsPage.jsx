import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMetadata } from '../hooks/usePageMetadata.js'
import { useAuth } from '../hooks/useAuth.js'
import { useNotifications } from '../hooks/useNotifications.js'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notifications.service.js'

function EventIcon({ kind }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'like' ? (
        <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
      ) : kind === 'save' ? (
        <path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91L12 3Z" />
      ) : (
        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l2-5a8.5 8.5 0 1 1 16-3.5Z" />
      )}
    </svg>
  )
}
export default function NotificationsPage() {
  const { user, profile } = useAuth()
  return <NotificationInbox key={user?.id ?? profile?.id} />
}
function NotificationInbox() {
  const { t, i18n } = useTranslation()
  const { unreadCount, updateUnread } = useNotifications()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const requestKey = `${page}:${i18n.resolvedLanguage}`
  const [loaded, setLoaded] = useState(null)
  const result = loaded?.key === requestKey ? loaded.data : null
  const loading = loaded?.key !== requestKey
  const [actionError, setActionError] = useState(null)
  const error =
    actionError || (loaded?.key === requestKey ? loaded.error : null)
  const [busy, setBusy] = useState(null)
  usePageMetadata(t('notifications.title'))
  useEffect(() => {
    let cancelled = false
    getNotifications({ page, limit: 20 })
      .then((response) => {
        if (cancelled) return
        if (
          response.pagination.totalPages > 0 &&
          page > response.pagination.totalPages
        ) {
          setPage(response.pagination.totalPages)
          return
        }
        setLoaded({ key: requestKey, data: response, error: null })
        updateUnread(response.unreadCount)
      })
      .catch(() => {
        if (!cancelled)
          setLoaded((current) => ({
            key: requestKey,
            data: current?.key === requestKey ? current.data : null,
            error: t('notifications.loadError'),
          }))
      })

    return () => {
      cancelled = true
    }
  }, [page, retry, requestKey, t, updateUnread])
  useEffect(() => {
    function refresh() {
      if (!busy && document.visibilityState !== 'hidden')
        setRetry((value) => value + 1)
    }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [busy])

  async function readAll() {
    if (busy || !result) return
    setBusy('all')
    setActionError(null)
    try {
      const response = await markAllNotificationsRead(result.asOf)
      updateUnread(response.count)
      setLoaded((current) => ({
        ...current,
        data: {
          ...current.data,
          notifications: current.data.notifications.map((notice) =>
            notice.created_at <= current.data.asOf
              ? { ...notice, read_at: notice.read_at ?? current.data.asOf }
              : notice,
          ),
        },
      }))
    } catch {
      setActionError(t('notifications.readError'))
    } finally {
      setBusy(null)
    }
  }
  async function openNotification(event, notice, path) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    if (busy) return
    setBusy(notice.id)
    setActionError(null)
    try {
      if (!notice.read_at) {
        const response = await markNotificationRead(notice.id)
        updateUnread(response.count)
      }
      navigate(path)
    } catch {
      setActionError(t('notifications.readError'))
      setBusy(null)
    }
  }
  const formatDate = (date) =>
    new Intl.DateTimeFormat(
      i18n.resolvedLanguage?.startsWith('en') ? 'en-GB' : 'es-ES',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(new Date(date))
  return (
    <main className="page notifications-page">
      <header className="notifications-header">
        <div>
          <p className="page-eyebrow">{t('dashboard.title')}</p>
          <h1>{t('notifications.title')}</h1>
        </div>
        <Link className="notifications-back" to="/dashboard">
          {t('profile.back')} <span aria-hidden="true">→</span>
        </Link>
      </header>
      <div className="notifications-toolbar">
        <p>
          {unreadCount === null
            ? t('notifications.recent')
            : unreadCount > 0
              ? t('notifications.unreadSummary', { count: unreadCount })
              : t('notifications.upToDate')}
        </p>
        <button
          type="button"
          className="notifications-read-all"
          disabled={!unreadCount || loading || Boolean(busy) || !result}
          onClick={readAll}
        >
          {t('notifications.readAll')}
        </button>
      </div>
      {error && (
        <p role="alert" className="notifications-error">
          {error}{' '}
          <button
            type="button"
            className="navigation-button"
            onClick={() => {
              setActionError(null)
              setRetry((value) => value + 1)
            }}
          >
            {t('common.retry')}
          </button>
        </p>
      )}
      {loading ? (
        <p role="status">{t('notifications.loading')}</p>
      ) : (
        result && (
          <>
            {result.notifications.length === 0 ? (
              <section className="notifications-empty">
                <h2>{t('notifications.emptyTitle')}</h2>
                <p>{t('notifications.empty')}</p>
              </section>
            ) : (
              <ul className="notification-list">
                {result.notifications.map((notice) => {
                  const article = notice.article
                  const published =
                    article?.status === 'published' &&
                    new Date(article.published_at).getTime() <=
                      new Date(result.asOf).getTime()
                  const path = article
                    ? published && article.author?.username
                      ? `/${article.author.username}/${article.slug}${notice.kind === 'comment' ? '#comments' : ''}`
                      : `/dashboard/articles/${article.id}/edit`
                    : '/dashboard'
                  const actor =
                    [notice.actor?.name, notice.actor?.surname]
                      .filter(Boolean)
                      .join(' ') ||
                    notice.actor?.username ||
                    t('notifications.someone')
                  return (
                    <li key={notice.id}>
                      <Link
                        to={path}
                        className={`notification-row${notice.read_at ? '' : ' notification-row--unread'}`}
                        onClick={(event) =>
                          void openNotification(event, notice, path)
                        }
                        aria-busy={busy === notice.id}
                      >
                        <span className="notification-row__icon">
                          <EventIcon kind={notice.kind} />
                        </span>
                        <div className="notification-row__copy">
                          <p>
                            <strong>{actor}</strong>{' '}
                            {t(`notifications.events.${notice.kind}`)}
                            {!notice.read_at && (
                              <span
                                className="notification-row__unread"
                                aria-label={t('notifications.unread')}
                              />
                            )}
                          </p>
                          <h2>
                            {article?.title ?? t('notifications.unavailable')}
                          </h2>
                          {notice.kind === 'comment' &&
                            notice.comment?.content && (
                              <p className="notification-row__comment">
                                {notice.comment.content.slice(0, 220)}
                              </p>
                            )}
                          <time dateTime={notice.created_at}>
                            {formatDate(notice.created_at)}
                          </time>
                        </div>
                        <span
                          className="notification-row__arrow"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            {result.pagination.totalPages > 1 && (
              <nav
                className="articles-pagination"
                aria-label={t('notifications.pagination')}
              >
                <button
                  type="button"
                  disabled={page <= 1 || Boolean(busy)}
                  onClick={() => setPage((value) => value - 1)}
                >
                  {t('articles.pagination.previous')}
                </button>
                <span>
                  {t('articles.pagination.page', {
                    page,
                    totalPages: result.pagination.totalPages,
                  })}
                </span>
                <button
                  type="button"
                  disabled={
                    page >= result.pagination.totalPages || Boolean(busy)
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t('articles.pagination.next')}
                </button>
              </nav>
            )}
          </>
        )
      )}
    </main>
  )
}
