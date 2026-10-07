import { supabasePublic } from '../config/supabase.js'

export async function findAllCategories() {
  const { data, error } = await supabasePublic
    .from('categories')
    .select('id, name, slug, description')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Unable to fetch categories: ${error.message}`)
  }

  return data
}