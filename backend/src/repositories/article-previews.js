export function articlePreview({ excerpt, content = '' }) {
  if (excerpt?.trim()) return excerpt.trim()
  let text = content
  try {
    const saved = JSON.parse(content)
    if (
      saved.format === 'margen-rich-text' &&
      saved.version === 1 &&
      saved.doc?.type === 'doc' &&
      Array.isArray(saved.doc.content)
    ) {
      text = saved.doc.content
        .filter((node) => node?.type === 'paragraph')
        .map((paragraph) =>
          (Array.isArray(paragraph.content) ? paragraph.content : [])
            .map((node) =>
              node?.type === 'text' && typeof node.text === 'string'
                ? node.text
                : ' ',
            )
            .join(''),
        )
        .join(' ')
    }
  } catch {
    /* Existing articles contain literal text. */
  }
  const compact = text.replace(/\s+/gu, ' ').trim()
  if (compact.length <= 220) return compact
  const start = compact.slice(0, 221)
  const end = start.lastIndexOf(' ')
  return `${start.slice(0, end > 160 ? end : 220).trimEnd()}…`
}

// Fetch bodies in one scoped query only when an introduction is missing.
// Keep the full bodies out of list responses and never overwrite the excerpt.
export async function addArticlePreviews(articles, supabase) {
  const missing = articles.filter((article) => !article.excerpt?.trim())
  let contents = new Map()
  if (missing.length) {
    const { data, error } = await supabase
      .from('articles')
      .select('id,content')
      .in(
        'id',
        missing.map((article) => article.id),
      )
    if (error) throw error
    contents = new Map(
      (data ?? []).map((article) => [article.id, article.content]),
    )
  }
  return articles.map((article) => ({
    ...article,
    preview: articlePreview({
      excerpt: article.excerpt,
      content: contents.get(article.id) ?? '',
    }),
  }))
}
