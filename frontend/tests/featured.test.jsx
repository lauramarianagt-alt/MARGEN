// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../src/i18n/index.js'
import FeaturedArticlesCarousel from '../src/components/FeaturedArticlesCarousel.jsx'
const mocks = vi.hoisted(() => ({ getFeaturedArticles: vi.fn() }))
vi.mock('../src/services/articles.service.js', () => mocks)
const articles = [1, 2, 3, 4].map((i) => ({
  id: String(i),
  slug: 'story-' + i,
  title: 'Historia ' + i,
  excerpt: 'Texto de la historia ' + i,
  author: { username: 'Laura', name: 'Laura', surname: 'Guillén' },
  cover_image_url: 'https://example.test/' + i + '.webp',
  likes_today: i === 1 ? 2 : 0,
  article_categories: [{ category: { name: 'Design' } }],
}))
function show() {
  return render(
    <MemoryRouter>
      <FeaturedArticlesCarousel />
    </MemoryRouter>,
  )
}
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('es')
  mocks.getFeaturedArticles.mockResolvedValue({ articles, mode: 'daily-likes' })
})
afterEach(cleanup)
describe('Homepage featured carousel', () => {
  it('shows real daily likes and links to the selected article', async () => {
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    expect(screen.getByText('Lo más valorado hoy')).toBeTruthy()
    expect(screen.getByText('2 me gusta hoy')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Leer historia' }).getAttribute('href'),
    ).toBe('/Laura/story-1')
  })
  it('moves and wraps with arrows and direct indicators', async () => {
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    fireEvent.click(screen.getByRole('button', { name: 'Historia anterior' }))
    expect(screen.getByRole('heading', { name: 'Historia 4' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Historia siguiente' }))
    expect(screen.getByRole('heading', { name: 'Historia 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver: Historia 3' }))
    expect(screen.getByRole('heading', { name: 'Historia 3' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'Ver: Historia 3' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
  it('supports focused keyboard navigation and touch swipes', async () => {
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    const carousel = screen.getByRole('region', {
      name: 'Historias destacadas',
    })
    fireEvent.keyDown(carousel, { key: 'End' })
    expect(screen.getByRole('heading', { name: 'Historia 4' })).toBeTruthy()
    fireEvent.keyDown(carousel, { key: 'Home' })
    fireEvent.keyDown(carousel, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Historia 2' })).toBeTruthy()
    fireEvent.touchStart(carousel, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 50 }] })
    expect(screen.getByRole('heading', { name: 'Historia 3' })).toBeTruthy()
  })
  it('labels the no-vote fallback as latest stories instead of inventing popularity', async () => {
    mocks.getFeaturedArticles.mockResolvedValue({
      articles: articles.map((a) => ({ ...a, likes_today: 0 })),
      mode: 'latest',
    })
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    expect(screen.getByText('Últimas historias')).toBeTruthy()
    expect(screen.queryByText('Lo más valorado hoy')).toBeNull()
    expect(screen.queryByText('2 me gusta hoy')).toBeNull()
  })
  it('handles a single story without redundant navigation', async () => {
    mocks.getFeaturedArticles.mockResolvedValue({
      articles: [articles[0]],
      mode: 'daily-likes',
    })
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    expect(
      screen.queryByRole('button', { name: 'Historia siguiente' }),
    ).toBeNull()
  })
  it('retains the editorial opening with no stories and retries a failed request', async () => {
    mocks.getFeaturedArticles.mockRejectedValueOnce(new Error('offline'))
    show()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Volver a cargar las historias destacadas',
      }),
    )
    await screen.findByRole('heading', { name: 'Historia 1' })
    expect(mocks.getFeaturedArticles).toHaveBeenCalledTimes(2)
  })
  it('exposes only the current story while retaining inactive panels for stable layout', async () => {
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      document.querySelectorAll(
        '.featured-carousel__story[inert][aria-hidden="true"]',
      ),
    ).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Historia siguiente' }))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Historia 2' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Historia 1' })).toBeNull()
  })
  it('translates the controls into English', async () => {
    await i18n.changeLanguage('en')
    show()
    await screen.findByRole('heading', { name: 'Historia 1' })
    expect(screen.getByText('Today’s most liked')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next story' })).toBeTruthy()
  })
})
