import { useContext } from 'react'
import { NotificationsContext } from '../context/notifications-context.js'
export function useNotifications() {
  return useContext(NotificationsContext)
}
