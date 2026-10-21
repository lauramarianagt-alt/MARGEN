import { createSupabaseUserClient, supabasePublic } from '../config/supabase.js'
const columns =
  'id,owner_id,article_id,image_url,thumbnail_url,width,height,thumbnail_width,alt_text,caption,created_at'
function checked(result) {
  if (result.error) throw result.error
  return result.data
}
export async function findGallery({ accessToken, ownerId, articleId }) {
  const client = accessToken
    ? createSupabaseUserClient(accessToken)
    : supabasePublic
  const query = client
    .from('gallery_images')
    .select(columns)
    .eq('owner_id', ownerId)
    .eq('article_id', articleId)
  return checked(await query.order('created_at').order('id')) ?? []
}
export async function findGalleryImage(accessToken, id) {
  return checked(
    await createSupabaseUserClient(accessToken)
      .from('gallery_images')
      .select('*')
      .eq('id', id)
      .maybeSingle(),
  )
}
export async function insertGalleryImage(accessToken, row) {
  return checked(
    await createSupabaseUserClient(accessToken)
      .from('gallery_images')
      .insert(row)
      .select(columns)
      .single(),
  )
}
export async function updateGalleryImage(accessToken, id, ownerId, values) {
  return checked(
    await createSupabaseUserClient(accessToken)
      .from('gallery_images')
      .update(values)
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select(columns)
      .single(),
  )
}
export async function deleteGalleryImage(accessToken, id, ownerId) {
  return checked(
    await createSupabaseUserClient(accessToken)
      .from('gallery_images')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select('id')
      .single(),
  )
}
export async function findArticleGalleryFiles(accessToken, articleId) {
  return (
    checked(
      await createSupabaseUserClient(accessToken)
        .from('gallery_images')
        .select('storage_path,thumbnail_path')
        .eq('article_id', articleId),
    ) ?? []
  )
}
