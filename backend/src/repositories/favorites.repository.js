import { addArticlePreviews } from './article-previews.js'
import { createSupabaseUserClient } from '../config/supabase.js'

const FAVORITE_LIST_SELECT = `
  user_id,
  article_id,
  created_at,
  article:articles!favorites_article_id_fkey (
    id,
    author_id,
    title,
    slug,
    excerpt,
    cover_image_url,
    language,
    status,
    published_at,
    created_at,
    updated_at,
    author:profiles!articles_author_id_fkey (
      id,
      username,
      name,
      surname,
      avatar_url
    ),
    article_categories (
      category:categories (
        id,
        name,
        slug
      )
    )
  )
`

function throwDatabaseError(error, context) {
  const databaseError = new Error(`${context}: ${error.message}`)

  databaseError.cause = error

  throw databaseError
}

export async function findFavoriteableArticleById(accessToken, articleId) {
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
    throwDatabaseError(error, 'Unable to load favoriteable article')
  }

  return data
}

export async function findFavoriteByArticleId(accessToken, userId, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('favorites')
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
    throwDatabaseError(error, 'Unable to load favorite')
  }

  return data
}

export async function createFavorite(accessToken, userId, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('favorites')
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
    throwDatabaseError(error, 'Unable to create favorite')
  }

  return data
}

export async function deleteFavorite(accessToken, userId, articleId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('favorites')
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
    throwDatabaseError(error, 'Unable to delete favorite')
  }

  return data
}

export async function findUserFavorites(
  accessToken,
  userId,
  { limit = 20, offset = 0 } = {},
) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error, count } = await supabase
    .from('favorites')
    .select(FAVORITE_LIST_SELECT, {
      count: 'exact',
    })
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    })
    .range(offset, offset + limit - 1)

  if (error) {
    throwDatabaseError(error, 'Unable to load user favorites')
  }

  const available = (data ?? []).flatMap((favorite) =>
    favorite.article ? [favorite.article] : [],
  )
  const previews = new Map(
    (await addArticlePreviews(available, supabase)).map((article) => [
      article.id,
      article,
    ]),
  )
  return {
    favorites: (data ?? []).map((favorite) => ({
      ...favorite,
      article: favorite.article
        ? previews.get(favorite.article.id)
        : favorite.article,
    })),
    count: count ?? 0,
  }
}
