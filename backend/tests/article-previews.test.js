import { expect, it, vi } from 'vitest'
import {
  articlePreview,
  addArticlePreviews,
} from '../src/repositories/article-previews.js'

it('keeps a supplied introduction and only falls back when it is blank', () => {
  expect(
    articlePreview({ excerpt: ' Mi introducción. ', content: 'Otra cosa.' }),
  ).toBe('Mi introducción.')
  expect(
    articlePreview({ excerpt: ' ', content: 'Primera línea.\n\nOtra línea.' }),
  ).toBe('Primera línea. Otra línea.')
})
it('extracts text from formatted paragraphs without exposing the JSON structure', () => {
  const content = JSON.stringify({
    format: 'margen-rich-text',
    version: 1,
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Una mirada', marks: [{ type: 'bold' }] },
            { type: 'hardBreak' },
            { type: 'text', text: 'propia.' },
          ],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Siguiente párrafo.' }],
        },
      ],
    },
  })
  expect(articlePreview({ content })).toBe(
    'Una mirada propia. Siguiente párrafo.',
  )
})
it('truncates long previews at a word boundary and keeps empty drafts empty', () => {
  const text = 'Una historia sobre moda y cultura. '.repeat(30)
  const preview = articlePreview({ content: text })
  expect(preview.length).toBeLessThanOrEqual(221)
  expect(preview.endsWith('…')).toBe(true)
  expect(articlePreview({})).toBe('')
})
it('does not request article bodies when every article has an introduction', async () => {
  const supabase = { from: vi.fn() }
  const articles = [{ id: 'one', excerpt: 'Introducción.' }]
  expect(await addArticlePreviews(articles, supabase)).toEqual([
    { ...articles[0], preview: 'Introducción.' },
  ])
  expect(supabase.from).not.toHaveBeenCalled()
})
it('loads missing introductions together with the supplied RLS client, preserving empty excerpts', async () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    in: vi
      .fn()
      .mockResolvedValue({
        data: [{ id: 'two', content: 'Comienzo del artículo.' }],
      }),
  }
  const supabase = { from: vi.fn().mockReturnValue(query) }
  const result = await addArticlePreviews(
    [
      { id: 'one', excerpt: 'Introducción.' },
      { id: 'two', excerpt: null },
    ],
    supabase,
  )
  expect(query.in).toHaveBeenCalledWith('id', ['two'])
  expect(result[1]).toEqual({
    id: 'two',
    excerpt: null,
    preview: 'Comienzo del artículo.',
  })
  expect(result[1].content).toBeUndefined()
})
