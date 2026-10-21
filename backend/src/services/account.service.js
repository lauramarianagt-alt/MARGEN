import { createSupabaseUserClient, supabaseAdmin } from '../config/supabase.js'
export class AccountError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
async function ownedImagePaths(userId) {
  const bucket = supabaseAdmin.storage.from('article-covers')
  const folders = [userId]
  const paths = []
  while (folders.length) {
    const prefix = folders.pop()
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (error) throw error
      for (const item of data ?? []) {
        if (
          !item.name ||
          item.name.includes('/') ||
          ['.', '..'].includes(item.name)
        )
          throw new Error('Invalid stored image path')
        const path = `${prefix}/${item.name}`
        if (item.id) paths.push(path)
        else folders.push(path)
      }
      if (!data || data.length < 100) break
    }
  }
  return { bucket, paths }
}
export async function closeAccount({
  accessToken,
  user,
  password,
  confirmation,
  acknowledged,
}) {
  if (!acknowledged || !user?.email)
    throw new AccountError(400, 'Account confirmation required')
  const client = createSupabaseUserClient(accessToken)
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()
  if (profileError || !profile)
    throw new AccountError(400, 'Unable to verify account')
  if (confirmation !== profile.username)
    throw new AccountError(400, 'Account confirmation does not match')
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (error || !data?.user || data.user.id !== user.id || !data.session)
    throw new AccountError(401, 'Password verification failed')
  // List everything before removal so pagination cannot skip objects. The prefix
  // is taken from the verified session, never from a URL or submitted user ID.
  const { bucket, paths } = await ownedImagePaths(user.id)
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error: storageError } = await bucket.remove(
      paths.slice(offset, offset + 100),
    )
    if (storageError) throw storageError
  }
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
    user.id,
  )
  if (deleteError) throw deleteError
}
