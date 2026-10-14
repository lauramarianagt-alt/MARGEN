import {
  createSupabaseUserClient,
  supabasePublic,
} from '../config/supabase.js'

const ARTICLE_LIST_SELECT = `
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
`

const ARTICLE_DETAIL_SELECT = `
  id,
  author_id,
  title,
  slug,
  excerpt,
  content,
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
    bio,
    avatar_url
  ),
  article_categories (
    category:categories (
      id,
      name,
      slug
    )
  )
`

function throwDatabaseError(error, context) {
  const databaseError = new Error(
    `${context}: ${error.message}`,
  )

  databaseError.cause = error

  throw databaseError
}

export async function findCategoriesByIds(
  accessToken,
  categoryIds,
) {
  if (categoryIds.length === 0) {
    return []
  }

  const supabase =
    createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .in('id', categoryIds)

  if (error) {
    throwDatabaseError(
      error,
      'Unable to load categories',
    )
  }

  return data ?? []
}

export async function findArticleBySlug(
  accessToken,
  authorId,
  slug,
  excludedArticleId = null,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  let query = supabase
    .from('articles')
    .select('id')
    .eq('author_id', authorId)
    .eq('slug', slug)

  if (excludedArticleId) {
    query = query.neq(
      'id',
      excludedArticleId,
    )
  }

  const { data, error } =
    await query.maybeSingle()

  if (error) {
    throwDatabaseError(
      error,
      'Unable to check article slug',
    )
  }

  return data
}

export async function createArticle(
  accessToken,
  article,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select('*')
    .single()

  if (error) {
    throwDatabaseError(
      error,
      'Unable to create article',
    )
  }

  return data
}

export async function addArticleCategories(
  accessToken,
  articleId,
  categoryIds,
) {
  if (categoryIds.length === 0) {
    return []
  }

  const supabase =
    createSupabaseUserClient(accessToken)

  const rows = categoryIds.map(
    (categoryId) => ({
      article_id: articleId,
      category_id: categoryId,
    }),
  )

  const { data, error } = await supabase
    .from('article_categories')
    .insert(rows)
    .select()

  if (error) {
    throwDatabaseError(
      error,
      'Unable to assign article categories',
    )
  }

  return data ?? []
}

export async function getArticleCategoryIds(
  accessToken,
  articleId,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('article_categories')
    .select('category_id')
    .eq('article_id', articleId)

  if (error) {
    throwDatabaseError(
      error,
      'Unable to load article categories',
    )
  }

  return (data ?? []).map(
    ({ category_id: categoryId }) =>
      categoryId,
  )
}

export async function removeArticleCategories(
  accessToken,
  articleId,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const { error } = await supabase
    .from('article_categories')
    .delete()
    .eq('article_id', articleId)

  if (error) {
    throwDatabaseError(
      error,
      'Unable to remove article categories',
    )
  }
}

export async function findOwnedArticleById(
  accessToken,
  articleId,
  authorId,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_DETAIL_SELECT)
    .eq('id', articleId)
    .eq('author_id', authorId)
    .maybeSingle()

  if (error) {
    throwDatabaseError(
      error,
      'Unable to load article',
    )
  }

  return data
}

export async function updateArticleById(
  accessToken,
  articleId,
  authorId,
  article,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const { data, error } = await supabase
    .from('articles')
    .update(article)
    .eq('id', articleId)
    .eq('author_id', authorId)
    .select('*')
    .single()

  if (error) {
    throwDatabaseError(
      error,
      'Unable to update article',
    )
  }

  return data
}

export async function deleteArticleById(
  accessToken,
  articleId,
  authorId,
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId)
    .eq('author_id', authorId)

  if (error) {
    throwDatabaseError(
      error,
      'Unable to delete article',
    )
  }
}

export async function findOwnArticles(
  accessToken,
  authorId,
  {
    limit = 20,
    offset = 0,
  } = {},
) {
  const supabase =
    createSupabaseUserClient(accessToken)

  const {
    data,
    error,
    count,
  } = await supabase
    .from('articles')
    .select(
      ARTICLE_LIST_SELECT,
      {
        count: 'exact',
      },
    )
    .eq('author_id', authorId)
    .order('updated_at', {
      ascending: false,
    })
    .range(
      offset,
      offset + limit - 1,
    )

  if (error) {
    throwDatabaseError(
      error,
      'Unable to load user articles',
    )
  }

  return {
    articles: data ?? [],
    count: count ?? 0,
  }
}

export async function findPublicArticles({
  limit = 10,
  offset = 0,
} = {}) {
  const now =
    new Date().toISOString()

  const {
    data,
    error,
    count,
  } = await supabasePublic
    .from('articles')
    .select(
      ARTICLE_LIST_SELECT,
      {
        count: 'exact',
      },
    )
    .eq('status', 'published')
    .lte('published_at', now)
    .order('published_at', {
      ascending: false,
    })
    .range(
      offset,
      offset + limit - 1,
    )

  if (error) {
    throwDatabaseError(
      error,
      'Unable to load public articles',
    )
  }

  return {
    articles: data ?? [],
    count: count ?? 0,
  }
}