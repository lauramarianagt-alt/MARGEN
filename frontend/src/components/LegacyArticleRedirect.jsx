import { Navigate, useParams } from 'react-router-dom'

function LegacyArticleRedirect() {
  const { username, slug } = useParams()

  return (
    <Navigate
      to={`/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`}
      replace
    />
  )
}

export default LegacyArticleRedirect
