import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute.jsx'
import RootLayout from './layouts/RootLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import MyArticlesPage from './pages/MyArticlesPage.jsx'
import CreateArticlePage from './pages/CreateArticlePage.jsx'
import EditArticlePage from './pages/EditArticlePage.jsx'
import LegacyArticleRedirect from './components/LegacyArticleRedirect.jsx'
import PublicArticlePage from './pages/PublicArticlePage.jsx'

function App() {
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))

    if (hashParams.has('access_token')) {
      const url = new URL(window.location.href)

      url.hash = ''
      url.searchParams.set('emailConfirmed', 'true')

      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    }
  }, [])

  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="/:username/:slug" element={<PublicArticlePage />} />

        <Route
          path="/articles/:username/:slug"
          element={<LegacyArticleRedirect />}
        />
        <Route
          path="/dashboard/articles/:id/edit"
          element={<EditArticlePage />}
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/articles" element={<MyArticlesPage />} />
          <Route
            path="/dashboard/articles/new"
            element={<CreateArticlePage />}
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
