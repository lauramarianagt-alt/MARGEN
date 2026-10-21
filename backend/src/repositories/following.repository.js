import { createSupabaseUserClient } from '../config/supabase.js'
function checked(result) {
  if (result.error) throw result.error
  return result.data
}
export async function findFollowing(accessToken, followerId, authorId) {
  return checked(
    await createSupabaseUserClient(accessToken)
      .from('author_follows')
      .select('author_id')
      .eq('follower_id', followerId)
      .eq('author_id', authorId)
      .maybeSingle(),
  )
}
export async function saveFollowing(accessToken, followerId, authorId) {
  checked(
    await createSupabaseUserClient(accessToken)
      .from('author_follows')
      .upsert(
        { follower_id: followerId, author_id: authorId },
        { onConflict: 'follower_id,author_id', ignoreDuplicates: true },
      ),
  )
}
export async function deleteFollowing(accessToken, followerId, authorId) {
  checked(
    await createSupabaseUserClient(accessToken)
      .from('author_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('author_id', authorId),
  )
}
export async function findPersonalizedArticles(
  accessToken,
  { page, limit, search, category },
) {
  return checked(
    await createSupabaseUserClient(accessToken).rpc('personalized_articles', {
      p_limit: limit,
      p_offset: (page - 1) * limit,
      p_search: search ?? null,
      p_category: category ?? null,
    }),
  )
}
