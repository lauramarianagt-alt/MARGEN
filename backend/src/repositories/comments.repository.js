import { createSupabaseUserClient, supabasePublic } from '../config/supabase.js'

const COMMENT_SELECT = `
  id,
  article_id,
  author_id,
  content,
  created_at,
  updated_at,
  author:profiles!comments_author_id_fkey (
    id,
    username,
    name,
    surname,
    avatar_url
  )
`

function throwDatabaseError(error, context) {
  const databaseError = new Error(`${context}: ${error.message}`)

  databaseError.cause = error

  throw databaseError
}

export async function findCommentableArticleById(accessToken, articleId) {
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
    throwDatabaseError(error, 'Unable to load commentable article')
  }

  return data
}

export async function findPublicCommentsByArticleId(
  articleId,
  { limit = 20, offset = 0 } = {},
) {
  const { data, error, count } = await supabasePublic
    .from('comments')
    .select(COMMENT_SELECT, {
      count: 'exact',
    })
    .eq('article_id', articleId)
    .order('created_at', {
      ascending: false,
    })
    .order('id', {
      ascending: false,
    })
    .range(offset, offset + limit - 1)

  if (error) {
    throwDatabaseError(error, 'Unable to load article comments')
  }

  return {
    comments: data ?? [],
    count: count ?? 0,
  }
}

export async function createComment(accessToken, userId, articleId, content) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('comments')
    .insert({
      article_id: articleId,
      author_id: userId,
      content,
    })
    .select(COMMENT_SELECT)
    .single()

  if (error) {
    throwDatabaseError(error, 'Unable to create comment')
  }

  return data
}

export async function findCommentById(accessToken, commentId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('id', commentId)
    .maybeSingle()

  if (error) {
    throwDatabaseError(error, 'Unable to load comment')
  }

  return data
}

export async function deleteComment(accessToken, commentId, authorId) {
  const supabase = createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', authorId)
    .select(
      `
        id,
        article_id,
        author_id,
        content,
        created_at,
        updated_at
      `,
    )
    .maybeSingle()

  if (error) {
    throwDatabaseError(error, 'Unable to delete comment')
  }

  return data
}
