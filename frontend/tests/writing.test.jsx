// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { useState } from 'react'
import WritingField from '../src/components/articles/WritingField.jsx'
import ArticleContent from '../src/components/articles/ArticleContent.jsx'
import {
  contentToDocument,
  contentToText,
  serializeContent,
} from '../src/lib/article-content.js'
import i18n from '../src/i18n/index.js'
function Draft({ initial = '' }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <WritingField
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={false}
      />
      <output data-testid="saved">{value}</output>
    </>
  )
}
beforeEach(async () => {
  await i18n.changeLanguage('es')
  Range.prototype.getClientRects = () => []
  Range.prototype.getBoundingClientRect = () => ({
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  })
  vi.stubGlobal('requestAnimationFrame', (callback) => setTimeout(callback, 0))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('preserves existing paragraphs as literal text without changing the saved value', () => {
  const value = 'Una mirada propia.\n\nOtra perspectiva. <b>Texto literal</b>'
  render(<Draft initial={value} />)
  const input = screen.getByRole('textbox', { name: 'Contenido' })
  expect(input.textContent).toContain('<b>Texto literal</b>')
  expect(input.querySelectorAll('p')).toHaveLength(2)
  expect(screen.getByTestId('saved').textContent).toBe(value)
  expect(screen.getByText('7 palabras')).toBeTruthy()
})
it('disables the writing surface and formatting during submission', () => {
  render(
    <WritingField value="Historia guardada" onChange={() => {}} disabled />,
  )
  expect(
    screen
      .getByRole('textbox', { name: 'Contenido' })
      .getAttribute('contenteditable'),
  ).toBe('false')
  expect(screen.getByRole('button', { name: 'Negrita' }).disabled).toBe(true)
})
it('formats selected text, saves, reloads and renders all three marks', async () => {
  render(<Draft initial="Una mirada propia" />)
  const input = screen.getByRole('textbox', { name: 'Contenido' })
  fireEvent.keyDown(input, { key: 'a', code: 'KeyA', ctrlKey: true })
  for (const name of ['Negrita', 'Cursiva', 'Subrayado']) {
    fireEvent.click(screen.getByRole('button', { name }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name }).getAttribute('aria-pressed'),
      ).toBe('true'),
    )
  }
  const saved = screen.getByTestId('saved').textContent
  expect(contentToText(saved)).toBe('Una mirada propia')
  cleanup()
  const { container } = render(<ArticleContent content={saved} />)
  expect(container.querySelector('strong').textContent).toBe(
    'Una mirada propia',
  )
  expect(container.querySelector('em').textContent).toBe('Una mirada propia')
  expect(container.querySelector('u').textContent).toBe('Una mirada propia')
  cleanup()
  render(<WritingField value={saved} onChange={() => {}} />)
  const restored = screen.getByRole('textbox')
  expect(restored.querySelector('strong')).toBeTruthy()
  expect(restored.querySelector('em')).toBeTruthy()
  expect(restored.querySelector('u')).toBeTruthy()
})
it('preserves plain text at the API size limit without document overhead', () => {
  const text = 'x'.repeat(100000)
  expect(serializeContent(contentToDocument(text))).toBe(text)
})
it('renders stored script-like text literally and drops unknown marks and nodes', () => {
  const content = JSON.stringify({
    format: 'margen-rich-text',
    version: 1,
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '<script>bad()</script>',
              marks: [
                { type: 'link', attrs: { href: 'javascript:bad()' } },
                { type: 'bold' },
              ],
            },
          ],
        },
        { type: 'image', attrs: { src: 'bad', onerror: 'bad()' } },
      ],
    },
  })
  const { container } = render(<ArticleContent content={content} />)
  expect(container.querySelector('script,a,img')).toBeNull()
  expect(container.querySelector('strong').textContent).toBe(
    '<script>bad()</script>',
  )
})

it('makes HTTPS source URLs readable links while keeping executable schemes literal', () => {
  const { container } = render(
    <ArticleContent content="Fuente: https://example.com/reportaje javascript:alert(1)" />,
  )
  const link = container.querySelector('a')
  expect(link.getAttribute('href')).toBe('https://example.com/reportaje')
  expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  expect(container.querySelectorAll('a')).toHaveLength(1)
  expect(container.textContent).toContain('javascript:alert(1)')
})

it('preserves an attributed source link across saving and editing, stripping unsafe attributes', () => {
  const saved = JSON.stringify({
    format: 'margen-rich-text',
    version: 1,
    doc: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Fuente oficial',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.com/source',
                    onclick: 'bad()',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  })
  const { container } = render(<ArticleContent content={saved} />)
  expect(container.querySelector('a').textContent).toBe('Fuente oficial')
  expect(container.querySelector('a').getAttribute('href')).toBe(
    'https://example.com/source',
  )
  expect(container.querySelector('a').getAttribute('onclick')).toBeNull()
  cleanup()
  render(<WritingField value={saved} onChange={() => {}} />)
  expect(screen.getByRole('textbox').querySelector('a').textContent).toBe(
    'Fuente oficial',
  )
})
