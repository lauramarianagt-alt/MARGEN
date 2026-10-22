import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import LegacyArticleRedirect from './components/LegacyArticleRedirect.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import NotificationsProvider from './context/NotificationsProvider.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import RootLayout from './layouts/RootLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import CreateArticlePage from './pages/CreateArticlePage.jsx'
import EditArticlePage from './pages/EditArticlePage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MyArticlesPage from './pages/MyArticlesPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PublicArticlePage from './pages/PublicArticlePage.jsx'
import PublicAuthorPage from './pages/PublicAuthorPage.jsx'
import PublicCategoryPage from './pages/PublicCategoryPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import AboutPage from './pages/AboutPage.jsx'

function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))

    if (hashParams.has('access_token')) {
      const url = new URL(window.location.href)

      url.hash = ''
      url.searchParams.set('emailConfirmed', 'true')

      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
      navigate('/login?emailConfirmed=true', { replace: true })
    }
  }, [navigate])

  return (
    <Routes>
      <Route
        element={
          <NotificationsProvider>
            <RootLayout />
          </NotificationsProvider>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/quienes-somos" element={<AboutPage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="/categories/:slug" element={<PublicCategoryPage />} />

        <Route path="/:username" element={<PublicAuthorPage />} />

        <Route path="/:username/:slug" element={<PublicArticlePage />} />

        <Route
          path="/articles/:username/:slug"
          element={<LegacyArticleRedirect />}
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<MyArticlesPage />} />
            <Route
              path="/dashboard/favorites"
              element={<MyArticlesPage section="favorites" />}
            />
            <Route
              path="/dashboard/notifications"
              element={<NotificationsPage />}
            />
          </Route>
          <Route path="/dashboard/profile" element={<ProfilePage />} />

          <Route
            path="/dashboard/articles"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard/articles/new"
            element={<CreateArticlePage />}
          />

          <Route
            path="/dashboard/articles/:id/edit"
            element={<EditArticlePage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
