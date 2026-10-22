import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'

export default function DashboardLayout() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  return (
    <main className="page dashboard-page articles-page">
      <section className="dashboard-overview">
        <p className="page-eyebrow">{t('dashboard.title')}</p>
        <h1>{t('dashboard.welcome', { name: profile?.name })}</h1>
        {profile?.username && (
          <p className="dashboard-username">
            {t('dashboard.username', { username: profile.username })}
          </p>
        )}
      </section>

      <div className="dashboard-toolbar">
        <nav
          className="dashboard-sections"
          aria-label={t('dashboard.sections')}
        >
          <NavLink className="dashboard-section-button" to="/dashboard" end>
            {t('articles.my.title')}
          </NavLink>
          <NavLink
            className="dashboard-section-button"
            to="/dashboard/favorites"
          >
            {t('favorites.title')}
          </NavLink>
          <NavLink
            className="dashboard-section-button"
            to="/dashboard/notifications"
          >
            {t('notifications.title')}
          </NavLink>
        </nav>
        <div className="dashboard-toolbar__actions">
          <Link to="/dashboard/profile">{t('profile.editLink')}</Link>
          <Link
            className="dashboard-toolbar__create"
            to="/dashboard/articles/new"
          >
            {t('articles.my.create')}
          </Link>
        </div>
      </div>

      <Outlet />
    </main>
  )
}
