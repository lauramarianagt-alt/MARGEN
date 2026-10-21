// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import App from '../src/App.jsx'
import i18n from '../src/i18n/index.js'
import { ApiError } from '../src/services/api.js'

const mocks = vi.hoisted(() => ({
  getPublicArticle: vi.fn(),
  getPublicArticles: vi.fn(),
  getPublicAuthor: vi.fn(),
  getCategories: vi.fn(),
  getPublicCategory: vi.fn(),
  getArticleComments: vi.fn(),
  getArticleLikes: vi.fn(),
  getArticleLikeState: vi.fn(),
  getFavoriteState: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
}))
const auth = vi.hoisted(() => ({
  user: { id: 'member' },
  profile: { id: 'member', name: 'Reader' },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('../src/services/following.service.js', () => ({
  getPersonalizedFeed: (...args) => mocks.getPublicArticles(...args),
  getFollowing: vi.fn().mockResolvedValue({ following: false }),
  setFollowing: vi.fn(),
}))
vi.mock('../src/services/galleries.service.js', () => ({
  getPublicGallery: vi.fn().mockResolvedValue({ images: [] }),
}))
vi.mock('../src/hooks/useAuth.js', () => ({ useAuth: () => auth }))
vi.mock('../src/services/articles.service.js', async (original) => ({
  ...(await original()),
  getPublicArticle: mocks.getPublicArticle,
  getPublicArticles: mocks.getPublicArticles,
  getFeaturedArticles: vi
    .fn()
    .mockResolvedValue({ articles: [], mode: 'latest' }),
}))
vi.mock('../src/services/authors.service.js', () => ({
  getPublicAuthor: mocks.getPublicAuthor,
}))
vi.mock('../src/services/categories.service.js', () => ({
  getCategories: mocks.getCategories,
  getPublicCategory: mocks.getPublicCategory,
}))
vi.mock('../src/services/social.service.js', async (original) => ({
  ...(await original()),
  getArticleComments: mocks.getArticleComments,
  getArticleLikes: mocks.getArticleLikes,
  getArticleLikeState: mocks.getArticleLikeState,
  getFavoriteState: mocks.getFavoriteState,
  addComment: mocks.addComment,
  deleteComment: mocks.deleteComment,
}))

const category = { id: 'design-category', slug: 'design', name: 'Design' }
const author = { id: 'writer', username: 'Lau', name: 'Laura', surname: 'Test' }
const article = {
  id: 'article-one',
  author_id: 'writer',
  author,
  title: 'An independent story',
  slug: 'story-one',
  language: 'es',
  excerpt: 'An editorial introduction.',
  content: 'Article body.',
  published_at: '2026-10-01T10:00:00Z',
  article_categories: [{ category }],
}
let comments
function Controls() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => navigate('/Lau/missing')}>
        Test missing article
      </button>
      <button onClick={() => navigate('/Lau/story-one')}>
        Test valid article
      </button>
      <button onClick={() => navigate('/Lau/story-two')}>
        Test other article
      </button>
      <button onClick={() => navigate('/?search=next')}>Test search</button>
    </>
  )
}
function renderApp(path = '/Lau/story-one') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Controls />
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
  await i18n.changeLanguage('es')
  auth.isAuthenticated = true
  auth.isLoading = false
  auth.register.mockResolvedValue({ requiresEmailConfirmation: true })
  auth.logout.mockImplementation(async () => {
    auth.isAuthenticated = false
  })
  comments = Array.from({ length: 12 }, (_, i) => ({
    id: `comment-${i + 1}`,
    author_id: 'member',
    author: { username: 'reader', name: 'Reader', surname: 'Test' },
    content: `Comentario de prueba ${i + 1}`,
    created_at: '2026-10-01T10:00:00Z',
  }))
  mocks.getPublicArticle.mockImplementation(async (username, slug) => {
    if (slug === 'missing') throw new ApiError('Article not found', 404)
    return {
      article: {
        ...article,
        id: slug === 'story-two' ? 'article-two' : article.id,
        title: slug === 'story-two' ? 'Another story' : article.title,
        slug,
      },
    }
  })
  mocks.getPublicArticles.mockResolvedValue({
    articles: [article],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  })
  mocks.getPublicAuthor.mockResolvedValue({ author })
  mocks.getCategories.mockResolvedValue([category])
  mocks.getPublicCategory.mockResolvedValue(category)
  mocks.getArticleLikes.mockResolvedValue({ count: 3 })
  mocks.getArticleLikeState.mockResolvedValue({ isLiked: false })
  mocks.getFavoriteState.mockResolvedValue({ isFavorite: false })
  mocks.getArticleComments.mockImplementation(
    async (id, { page = 1, limit = 10 } = {}) => ({
      comments: comments.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total: comments.length,
        totalPages: Math.ceil(comments.length / limit),
      },
    }),
  )
  mocks.addComment.mockImplementation(async (id, content) => {
    const comment = { ...comments[0], id: 'new-comment', content }
    comments.unshift(comment)
    return { comment }
  })
  mocks.deleteComment.mockImplementation(async (id) => {
    comments = comments.filter((c) => c.id !== id)
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Reader and member flows', () => {
  it('navigates beyond the first ten comments and back', async () => {
    const { container } = renderApp()
    await screen.findByText('Comentario de prueba 1')
    expect(container.querySelectorAll('.public-article__comment')).toHaveLength(
      10,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Comentario de prueba 12')
    expect(container.querySelectorAll('.public-article__comment')).toHaveLength(
      2,
    )
    expect(screen.getByRole('button', { name: 'Siguiente' }).disabled).toBe(
      true,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    await screen.findByText('Comentario de prueba 1')
    expect(screen.getByRole('button', { name: 'Anterior' }).disabled).toBe(true)
  })
  it('returns to page one and keeps the page size after publishing from page two', async () => {
    const { container } = renderApp()
    await screen.findByText('Comentario de prueba 1')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Comentario de prueba 12')
    fireEvent.change(screen.getByLabelText('Añade un comentario'), {
      target: { value: 'Nuevo comentario editorial' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar comentario' }))
    await screen.findByText('Nuevo comentario editorial', { selector: 'p' })
    expect(screen.getByText('Página 1 de 2')).toBeTruthy()
    expect(container.querySelectorAll('.public-article__comment')).toHaveLength(
      10,
    )
    expect(
      screen.getByRole('heading', { name: 'Comentarios (13)' }),
    ).toBeTruthy()
  })
  it('returns to the previous page after deleting the only comment on the last page', async () => {
    comments = comments.slice(0, 11)
    const { container } = renderApp()
    await screen.findByText('Comentario de prueba 1')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Comentario de prueba 11')
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    await screen.findByText('Comentario de prueba 1')
    expect(container.querySelectorAll('.public-article__comment')).toHaveLength(
      10,
    )
    expect(
      screen.queryByRole('navigation', { name: 'Paginación de comentarios' }),
    ).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Comentarios (10)' }),
    ).toBeTruthy()
  })
  it('recovers from an article 404 when navigating to a valid article', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp('/Lau/missing')
    await waitFor(() =>
      expect(mocks.getPublicArticle).toHaveBeenCalledWith('Lau', 'missing'),
    )
    await screen.findByText('Este artículo no está disponible')
    fireEvent.click(screen.getByRole('button', { name: 'Test valid article' }))
    expect(
      await screen.findByRole('heading', { name: article.title }),
    ).toBeTruthy()
  })
  it('clears the comment draft and page when navigating to another article', async () => {
    renderApp()
    await screen.findByText('Comentario de prueba 1')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    await screen.findByText('Comentario de prueba 12')
    fireEvent.change(screen.getByLabelText('Añade un comentario'), {
      target: { value: 'Unsent text' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Test other article' }))
    await screen.findByRole('heading', { name: 'Another story' })
    await screen.findByText('Comentario de prueba 1')
    expect(screen.getByLabelText('Añade un comentario').value).toBe('')
    expect(screen.getByText('Página 1 de 2')).toBeTruthy()
    expect(document.title).toBe('Another story · MARGEN')
  })
  it('shows loading rather than stale results when the search query changes', async () => {
    renderApp('/')
    await screen.findByRole('heading', { name: article.title })
    let finishSearch
    mocks.getPublicArticles.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSearch = resolve
        }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Test search' }))
    expect(screen.queryByRole('heading', { name: article.title })).toBeNull()
    await waitFor(() => expect(finishSearch).toBeTypeOf('function'))
    await act(async () =>
      finishSearch({
        articles: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
    )
    expect(mocks.getPublicArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'next', page: 1 }),
    )
  })
  it('translates category names and updates the document language', async () => {
    renderApp('/')
    await screen.findByRole('button', { name: 'Diseño' })
    fireEvent.click(screen.getByRole('button', { name: 'EN', exact: true }))
    expect(
      await screen.findByRole('button', { name: 'Design', exact: true }),
    ).toBeTruthy()
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toContain('MARGEN')
  })
  it('redirects an anonymous member-area request to login', async () => {
    auth.isAuthenticated = false
    renderApp('/dashboard')
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeTruthy()
  })
  it('shows a 404 page for an unmatched route', async () => {
    renderApp('/route/that/does-not-exist')
    expect(
      await screen.findByRole('heading', { name: 'Esta página no existe' }),
    ).toBeTruthy()
  })
  it('cleans confirmation tokens from the URL and displays the login confirmation', async () => {
    auth.isAuthenticated = false
    window.history.replaceState(
      {},
      '',
      '/#access_token=fake-test-token&type=signup',
    )
    renderApp('/')
    expect(
      await screen.findByText(
        'Tu correo ha sido confirmado. Ya puedes iniciar sesión.',
      ),
    ).toBeTruthy()
    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain('fake-test-token')
  })
  it('explains a reserved username returned by registration validation', async () => {
    auth.isAuthenticated = false
    auth.register.mockRejectedValue(
      new ApiError('Invalid request data', 400, {
        details: [{ field: 'username', message: 'This username is reserved' }],
      }),
    )
    const { container } = renderApp('/register')
    for (const [label, value] of [
      ['Nombre', 'Reader'],
      ['Apellidos', 'Test'],
      ['Nombre de usuario', 'login'],
      ['Correo electrónico', 'reader@example.com'],
      ['Contraseña', 'Password123!'],
      ['Confirmar contraseña', 'Password123!'],
    ]) {
      fireEvent.change(screen.getByLabelText(label, { exact: true }), {
        target: { value },
      })
    }
    fireEvent.submit(container.querySelector('form'))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ese nombre no es válido o está reservado. Elige otro.',
    )
  })
})

describe('Compact navigation controls', () => {
  it('opens navigation, closes it with Escape, and returns focus', async () => {
    renderApp('/')
    await screen.findByRole('heading', { name: article.title })
    const toggle = screen.getByRole('button', { name: 'Abrir menú' })
    fireEvent.click(toggle)
    expect(
      screen
        .getByRole('button', { name: 'Cerrar menú' })
        .getAttribute('aria-expanded'),
    ).toBe('true')
    fireEvent.keyDown(toggle, { key: 'Escape' })
    expect(
      screen
        .getByRole('button', { name: 'Abrir menú' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })
  it('closes navigation when opening search and restores search focus on Escape', async () => {
    renderApp('/')
    await screen.findByRole('heading', { name: article.title })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buscar artículos' }))
    expect(
      screen
        .getByRole('button', { name: 'Abrir menú' })
        .getAttribute('aria-expanded'),
    ).toBe('false')
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Buscar artículos' }),
    )
  })
})
