import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useAuth } from '../hooks/useAuth.js'

function ProtectedRoute() {
  const { t } = useTranslation()
  const location = useLocation()

  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="page">
        <p>{t('common.loading')}</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute
