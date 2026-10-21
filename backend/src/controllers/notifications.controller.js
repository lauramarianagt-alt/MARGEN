import { z } from 'zod'
import {
  findNotifications,
  countUnreadNotifications,
  markNotificationsRead,
} from '../repositories/notifications.repository.js'

const querySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()
const idSchema = z.object({ id: z.uuid() }).strict()
const readSchema = z
  .object({ before: z.iso.datetime({ offset: true }) })
  .strict()
function endpoint(schema, source, action) {
  return async (req, res) => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid notification request' })
    res.set('Cache-Control', 'no-store')
    try {
      return res.json(await action(req, parsed.data))
    } catch (error) {
      console.error('Notification request failed:', error)
      return res
        .status(500)
        .json({ error: 'Unable to load or update notifications' })
    }
  }
}
export const list = endpoint(
  querySchema,
  'query',
  async (req, { page, limit }) => {
    const asOf = new Date().toISOString()
    const [{ notifications, total }, unreadCount] = await Promise.all([
      findNotifications(req.accessToken, req.user.id, {
        limit,
        offset: (page - 1) * limit,
        before: asOf,
      }),
      countUnreadNotifications(req.accessToken, req.user.id),
    ])
    return {
      notifications,
      unreadCount,
      asOf,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  },
)
export const unread = endpoint(z.object({}).strict(), 'query', async (req) => ({
  count: await countUnreadNotifications(req.accessToken, req.user.id),
}))
export const readOne = endpoint(idSchema, 'params', async (req, { id }) => {
  await markNotificationsRead(req.accessToken, req.user.id, { id })
  return { count: await countUnreadNotifications(req.accessToken, req.user.id) }
})
export const readAll = endpoint(readSchema, 'body', async (req, { before }) => {
  const cutoff = new Date(
    Math.min(new Date(before).getTime(), Date.now()),
  ).toISOString()
  await markNotificationsRead(req.accessToken, req.user.id, { before: cutoff })
  return { count: await countUnreadNotifications(req.accessToken, req.user.id) }
})
