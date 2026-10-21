import { supabasePublic } from '../config/supabase.js'

export async function findFeaturedArticles(limit) {
  const { data, error } = await supabasePublic.rpc('featured_articles', {
    p_limit: limit,
  })
  if (error) throw error
  return data
}
