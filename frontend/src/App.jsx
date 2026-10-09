import { useEffect } from 'react'
import {
  Route,
  Routes,
} from 'react-router-dom'

import RootLayout from './layouts/RootLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

function App() {
  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.slice(1),
    )

    if (hashParams.has('access_token')) {
      const url = new URL(window.location.href)

      url.hash = ''
      url.searchParams.set(
        'emailConfirmed',
        'true',
      )

      window.history.replaceState(
        {},
        '',
        `${url.pathname}${url.search}`,
      )
    }
  }, [])

  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
      </Route>
    </Routes>
  )
}

export default App