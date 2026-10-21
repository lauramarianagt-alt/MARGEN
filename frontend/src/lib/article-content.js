// Versioned JSON distinguishes rich text from existing, literal-text articles.
export const MAX_ARTICLE_CONTENT = 100_000
const FORMAT = 'margen-rich-text'
const MARKS = new Set(['bold', 'italic', 'underline'])
function safeMarks(marks) {
  const result = []
  for (const mark of Array.isArray(marks) ? marks : []) {
    if (result.some((item) => item.type === mark?.type)) continue
    if (MARKS.has(mark?.type)) result.push({ type: mark.type })
    if (mark?.type === 'link') {
      try {
        const url = new URL(mark.attrs?.href)
        if (url.protocol === 'https:' || url.protocol === 'http:')
          result.push({ type: 'link', attrs: { href: url.href } })
      } catch {
        /* Keep unsupported or unsafe URLs as literal text. */
      }
    }
  }
  return result
}

export function readRichContent(value) {
  if (typeof value !== 'string' || !value.startsWith('{')) return null
  try {
    const saved = JSON.parse(value)
    const doc = saved.doc
    if (
      saved.format !== FORMAT ||
      saved.version !== 1 ||
      doc?.type !== 'doc' ||
      !Array.isArray(doc.content)
    )
      return null
    // Never accept HTML, attributes, links or arbitrary nodes from stored data.
    return {
      type: 'doc',
      content: doc.content
        .filter((node) => node?.type === 'paragraph')
        .map((node) => ({
          type: 'paragraph',
          content: (Array.isArray(node.content) ? node.content : []).flatMap(
            (inline) => {
              if (inline?.type === 'hardBreak') return [{ type: 'hardBreak' }]
              if (
                inline?.type !== 'text' ||
                typeof inline.text !== 'string' ||
                !inline.text
              )
                return []
              return [
                {
                  type: 'text',
                  text: inline.text,
                  marks: safeMarks(inline.marks),
                },
              ]
            },
          ),
        })),
    }
  } catch {
    return null
  }
}
export function contentToDocument(value = '') {
  const rich = readRichContent(value)
  if (rich)
    return rich.content.length
      ? rich
      : { type: 'doc', content: [{ type: 'paragraph' }] }
  return {
    type: 'doc',
    content: value
      .replace(/\r\n?/gu, '\n')
      .split('\n\n')
      .map((paragraph) => ({
        type: 'paragraph',
        content: paragraph
          .split('\n')
          .flatMap((line, index) => [
            ...(index ? [{ type: 'hardBreak' }] : []),
            ...(line ? [{ type: 'text', text: line }] : []),
          ]),
      })),
  }
}
export function serializeContent(doc) {
  const formatted = doc.content.some((paragraph) =>
    paragraph.content?.some((node) => node.marks?.length),
  )
  if (!formatted) return documentToText(doc)
  return JSON.stringify({ format: FORMAT, version: 1, doc })
}
function documentToText(doc) {
  return doc.content
    .map((paragraph) =>
      (paragraph.content ?? [])
        .map((node) => (node.type === 'hardBreak' ? '\n' : node.text))
        .join(''),
    )
    .join('\n\n')
}
export function contentToText(value = '') {
  const doc = readRichContent(value)
  return doc ? documentToText(doc) : value
}
export function getArticlePreview(article) {
  return article.preview?.trim() || article.excerpt?.trim() || ''
}
