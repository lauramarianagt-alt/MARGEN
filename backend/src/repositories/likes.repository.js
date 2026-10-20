import { createSupabaseUserClient, supabasePublic } from '../config/supabase.js'

function throwDatabaseError(error, context) {
  const databaseError = new Error(`${context}: ${error.message}`)

  databaseError.cause = error

  throw databaseError
}

export async function findLikeableArticleById(accessToken, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('articles')
    .select(
      `
        id,
        author_id,
        status,
        published_at
      `,
    )
    .eq('id', articleId)
    .maybeSingle()

  if (error) {
    throwDatabaseError(error, 'Unable to load likeable article')
  }

  return data
}

export async function findLikeByArticleId(accessToken, userId, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('article_likes')
    .select(
      `
        user_id,
        article_id,
        created_at
      `,
    )
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .maybeSingle()

  if (error) {
    throwDatabaseError(error, 'Unable to load article like')
  }

  return data
}

export async function createLike(accessToken, userId, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('article_likes')
    .insert({
      user_id: userId,
      article_id: articleId,
    })
    .select(
      `
        user_id,
        article_id,
        created_at
      `,
    )
    .single()

  if (error) {
    throwDatabaseError(error, 'Unable to create article like')
  }

  return data
}

export async function deleteLike(accessToken, userId, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('article_likes')
    .delete()
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .select(
      `
        user_id,
        article_id,
        created_at
      `,
    )
    .maybeSingle()

  if (error) {
    throwDatabaseError(error, 'Unable to delete article like')
  }

  return data
}

export async function countArticleLikes(articleId) {
  const { count, error } = await supabasePublic
    .from('article_likes')
    .select('article_id', {
      count: 'exact',
      head: true,
    })
    .eq('article_id', articleId)

  if (error) {
    throwDatabaseError(error, 'Unable to count article likes')
  }

  return count ?? 0
}
