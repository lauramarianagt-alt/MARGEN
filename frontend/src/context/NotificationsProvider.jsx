import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { getUnreadCount } from '../services/notifications.service.js'
import { NotificationsContext } from './notifications-context.js'

export default function NotificationsProvider({ children }) {
  const { user, profile, isAuthenticated, isLoading } = useAuth()
  const userId =
    isAuthenticated && !isLoading ? (user?.id ?? profile?.id) : null
  const [state, setState] = useState(null)
  const requestSequence = useRef(0)
  const owner = useRef(userId)

  const updateUnread = useCallback(
    (count) => {
      if (owner.current !== userId || !userId) return
      requestSequence.current += 1
      setState({ userId, count: Math.max(0, Number(count) || 0) })
    },
    [userId],
  )
  const refreshUnread = useCallback(async () => {
    if (!userId || document.visibilityState === 'hidden') return
    const sequence = ++requestSequence.current
    try {
      const result = await getUnreadCount()
      if (owner.current === userId && requestSequence.current === sequence) {
        setState({ userId, count: result.count })
      }
    } catch {
      if (owner.current === userId && requestSequence.current === sequence)
        setState(null)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    owner.current = userId
    const initial = window.setTimeout(refreshUnread, 0)
    const timer = window.setInterval(refreshUnread, 30000)
    window.addEventListener('focus', refreshUnread)
    document.addEventListener('visibilitychange', refreshUnread)
    return () => {
      requestSequence.current += 1
      window.clearTimeout(initial)
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshUnread)
      document.removeEventListener('visibilitychange', refreshUnread)
    }
  }, [userId, refreshUnread])

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount: state?.userId === userId ? state.count : null,
        refreshUnread,
        updateUnread,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}
