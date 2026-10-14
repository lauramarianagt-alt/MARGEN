import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth.js'

function DashboardPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()

  return (
    <main className="page dashboard-page">
      <p className="eyebrow">{t('dashboard.title')}</p>

      <h1>
        {t('dashboard.welcome', {
          name: profile.name,
        })}
      </h1>

      <p className="dashboard-username">
        {t('dashboard.username', {
          username: profile.username,
        })}
      </p>

      <Link className="dashboard-link" to="/dashboard/articles">
        {t('dashboard.myArticles')}
      </Link>
    </main>
  )
}

export default DashboardPage
