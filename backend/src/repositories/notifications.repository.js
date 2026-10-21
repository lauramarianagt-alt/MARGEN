import { createSupabaseUserClient } from '../config/supabase.js'

const SELECT = `id, kind, created_at, read_at,
  actor:profiles!notifications_actor_id_fkey (username, name, surname),
  article:articles!notifications_article_id_fkey (
    id, title, slug, status, published_at,
    author:profiles!articles_author_id_fkey (username)
  ),
  comment:comments!notifications_comment_id_fkey (content)`
function checked(result) {
  if (result.error) throw result.error
  return result
}
export async function findNotifications(
  accessToken,
  userId,
  { limit, offset, before },
) {
  const { data, count } = checked(
    await createSupabaseUserClient(accessToken)
      .from('notifications')
      .select(SELECT, { count: 'exact' })
      .eq('recipient_id', userId)
      .lte('created_at', before)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1),
  )
  return { notifications: data ?? [], total: count ?? 0 }
}
export async function countUnreadNotifications(accessToken, userId) {
  const { count } = checked(
    await createSupabaseUserClient(accessToken)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null),
  )
  return count ?? 0
}
export async function markNotificationsRead(
  accessToken,
  userId,
  { id, before },
) {
  let query = createSupabaseUserClient(accessToken)
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null)
  if (id) query = query.eq('id', id)
  else query = query.lte('created_at', before)
  checked(await query)
}
