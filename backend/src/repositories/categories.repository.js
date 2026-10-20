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

export async function findCategoryBySlug(slug) {
  const { data, error } = await supabasePublic
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error(`Unable to fetch category: ${error.message}`)
  }

  return data
}
