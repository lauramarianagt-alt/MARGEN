import { supabaseAdmin } from '../config/supabase.js'

export async function findProfileByUsername(username) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to find profile: ${error.message}`)
  }

  return data
}

export async function findProfileById(id) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      `
      id,
      username,
      name,
      surname,
      bio,
      avatar_url,
      preferred_locale,
      created_at,
      updated_at
    `,
    )
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Unable to find profile: ${error.message}`)
  }

  return data
}

export async function createProfile({
  id,
  username,
  name,
  surname,
  preferredLocale,
}) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({
      id,
      username,
      name,
      surname,
      preferred_locale: preferredLocale,
    })
    .select(
      `
      id,
      username,
      name,
      surname,
      bio,
      avatar_url,
      preferred_locale,
      created_at,
      updated_at
    `,
    )
    .single()

  if (error) {
    throw new Error(`Unable to create profile: ${error.message}`)
  }

  return data
}
