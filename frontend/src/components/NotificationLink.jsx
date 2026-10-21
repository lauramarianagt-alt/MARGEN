import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../hooks/useNotifications.js'
export default function NotificationLink({ onClick }) {
  const { t } = useTranslation()
  const { unreadCount } = useNotifications()
  return (
    <NavLink
      to="/dashboard/notifications"
      className="notification-link"
      title={t('notifications.title')}
      onClick={onClick}
      aria-label={
        unreadCount > 0
          ? t('notifications.unreadLabel', { count: unreadCount })
          : t('notifications.title')
      }
    >
      <svg
        className="notification-link__icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="notification-link__label">
        {t('notifications.title')}
      </span>
      {unreadCount > 0 && (
        <span className="notification-count" aria-hidden="true">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </NavLink>
  )
}
