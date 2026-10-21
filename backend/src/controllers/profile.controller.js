import { z } from 'zod'
import { createSupabaseUserClient } from '../config/supabase.js'
export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    surname: z.string().trim().min(1).max(80),
    bio: z.string().trim().max(1500).default(''),
  })
  .strict()
export async function updateProfile(req, res) {
  const validation = profileUpdateSchema.safeParse(req.body)
  if (!validation.success)
    return res.status(400).json({ error: 'Invalid profile data' })
  const { data, error } = await createSupabaseUserClient(req.accessToken)
    .from('profiles')
    .update(validation.data)
    .eq('id', req.user.id)
    .select('id,username,name,surname,bio,avatar_url,preferred_locale')
    .single()
  if (error) {
    console.error('Unable to update profile:', error)
    return res.status(500).json({ error: 'Unable to update profile' })
  }
  return res.json({ profile: data })
}
