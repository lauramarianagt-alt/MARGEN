import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth.js'
import { getFollowing, setFollowing } from '../services/following.service.js'
export default function FollowAuthorButton({ author }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useTranslation()
  const [following, setIsFollowing] = useState(false)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  const ownProfile = user?.id === author.id
  useEffect(() => {
    if (!isAuthenticated || ownProfile) return
    let active = true
    getFollowing(author.username)
      .then((result) => {
        if (active) {
          setIsFollowing(result.following)
          setStatus('ready')
          setError(false)
        }
      })
      .catch(() => {
        if (active) {
          setStatus('load-error')
          setError(true)
        }
      })
    return () => {
      active = false
    }
  }, [author.username, isAuthenticated, ownProfile, retry])
  async function toggle() {
    if (status !== 'ready') return
    setStatus('saving')
    setError(false)
    try {
      const result = await setFollowing(author.username, !following)
      setIsFollowing(result.following)
    } catch {
      setError(true)
    } finally {
      setStatus('ready')
    }
  }
  if (ownProfile || isLoading) return null
  if (!isAuthenticated)
    return (
      <Link className="follow-author" to="/login">
        {t('following.follow')}
      </Link>
    )
  return (
    <div className="follow-author-control">
      <button
        className="follow-author"
        type="button"
        aria-pressed={following}
        disabled={status === 'loading' || status === 'saving'}
        onClick={
          status === 'load-error'
            ? () => {
                setStatus('loading')
                setRetry((n) => n + 1)
              }
            : toggle
        }
      >
        {t(
          status === 'load-error'
            ? 'common.retry'
            : status === 'loading'
              ? 'common.loading'
              : status === 'saving'
                ? 'following.saving'
                : following
                  ? 'following.unfollow'
                  : 'following.follow',
        )}
      </button>
      {error && <p role="alert">{t('following.error')}</p>}
    </div>
  )
}
