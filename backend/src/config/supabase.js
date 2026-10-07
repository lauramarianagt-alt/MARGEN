import { createClient } from '@supabase/supabase-js'

import { env } from './env.js'

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
}

export const supabasePublic = createClient(
  env.supabaseUrl,
  env.supabasePublishableKey,
  {
    auth: authOptions,
  },
)

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseSecretKey,
  {
    auth: authOptions,
  },
)

export function createSupabaseUserClient(accessToken) {
  return createClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      auth: authOptions,
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    },
  )
}