import { supabasePublic } from '../config/supabase.js'

function throwDatabaseError(error, context) {
  const databaseError = new Error(`${context}: ${error.message}`)

  databaseError.cause = error

  throw databaseError
}

export async function findPublicAuthorByUsername(username) {
  const { data, error } = await supabasePublic
    .from('profiles')
    .select(
      `
      id,
      username,
      name,
      surname,
      bio,
      avatar_url
    `,
    )
    .eq('username', username)
    .maybeSingle()

  if (error) {
    throwDatabaseError(error, 'Unable to load public author')
  }

  return data
}
