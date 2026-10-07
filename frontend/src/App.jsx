import { useEffect } from 'react'

function App() {
  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.slice(1),
    )

    if (hashParams.has('access_token')) {
      const url = new URL(window.location.href)

      url.hash = ''
      url.searchParams.set('emailConfirmed', 'true')

      window.history.replaceState(
        {},
        '',
        `${url.pathname}${url.search}`,
      )
    }
  }, [])

  return (
    <main className="app">
      <p className="eyebrow">
        Independent fashion & visual culture
      </p>

      <h1>MARGEN</h1>

      <p className="tagline">
        Fashion deserves more than a feed.
      </p>
    </main>
  )
}

export default App