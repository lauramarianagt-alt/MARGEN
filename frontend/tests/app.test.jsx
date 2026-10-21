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
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getPublicArticle: vi.fn(),
  getPublicArticles: vi.fn(),
  getPublicAuthor: vi.fn(),
  getCategories: vi.fn(),
  getPublicCategory: vi.fn(),
  getArticleComments: vi.fn(),
  getArticleLikes: vi.fn(),
  getArticleLikeState: vi.fn(),
  getFavoriteState: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  addArticleLike: vi.fn(),
  removeArticleLike: vi.fn(),
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
vi.mock('../src/services/notifications.service.js', () => ({
  getNotifications: mocks.getNotifications,
  getUnreadCount: mocks.getUnreadCount,
  markNotificationRead: mocks.markNotificationRead,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
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
  addFavorite: mocks.addFavorite,
  removeFavorite: mocks.removeFavorite,
  addArticleLike: mocks.addArticleLike,
  removeArticleLike: mocks.removeArticleLike,
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
function appTree(path = '/Lau/story-one') {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Controls />
      <App />
    </MemoryRouter>
  )
}
function renderApp(path) {
  return render(appTree(path))
}

beforeEach(async () => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/')
  await i18n.changeLanguage('es')
  auth.user = { id: 'member' }
  auth.profile = { id: 'member', name: 'Reader' }
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
  mocks.getNotifications.mockResolvedValue({
    notifications: [],
    unreadCount: 0,
    asOf: '2026-10-22T00:00:00Z',
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  })
  mocks.getUnreadCount.mockResolvedValue({ count: 0 })
  mocks.markNotificationRead.mockResolvedValue({ count: 0 })
  mocks.markAllNotificationsRead.mockResolvedValue({ count: 0 })
  mocks.getArticleLikes.mockResolvedValue({ count: 3 })
  mocks.getArticleLikeState.mockResolvedValue({ isLiked: false })
  mocks.getFavoriteState.mockResolvedValue({ isFavorite: false })
  mocks.addFavorite.mockResolvedValue({})
  mocks.removeFavorite.mockResolvedValue({})
  mocks.addArticleLike.mockResolvedValue({ count: 4 })
  mocks.removeArticleLike.mockResolvedValue({ count: 3 })
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
  it('keeps a short category bar and filters additional categories without losing the search', async () => {
    mocks.getCategories.mockResolvedValue([
      category,
      { id: 'beauty', slug: 'beauty', name: 'Beauty' },
      { id: 'visual', slug: 'visual-culture', name: 'Visual culture' },
      { id: 'cosmetics', slug: 'cosmetics', name: 'Cosmetics' },
      { id: 'photography', slug: 'photography', name: 'Photography' },
    ])
    renderApp('/?search=style&page=2')
    const select = await screen.findByRole('button', {
      name: 'Más categorías',
    })
    expect(
      screen.getByRole('button', { name: 'Diseño', exact: true }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Cosmética', exact: true }),
    ).toBeNull()
    fireEvent.click(select)
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Cosmética' }))
    await waitFor(() =>
      expect(mocks.getPublicArticles).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: 'cosmetics',
          search: 'style',
          page: 1,
        }),
      ),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Más categorías: Cosmética' })
          .textContent,
      ).toContain('Cosmética'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Todas', exact: true }))
    await waitFor(() =>
      expect(mocks.getPublicArticles).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: null, search: 'style', page: 1 }),
      ),
    )
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

it('shows and hides the login password without submitting or changing it', async () => {
  auth.isAuthenticated = false
  const { container } = renderApp('/login')
  const password = screen.getByLabelText('Contraseña', { exact: true })
  fireEvent.change(password, {
    target: { value: 'sample-password-for-ui-test' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
  expect(password.type).toBe('text')
  expect(password.value).toBe('sample-password-for-ui-test')
  fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
  expect(password.type).toBe('password')
  expect(auth.login).not.toHaveBeenCalled()
  expect(container.querySelector('.password-field svg')).toBeTruthy()
})

describe('Shared article actions', () => {
  const likeButtons = () => screen.getAllByRole('button', { name: /^Me gusta/ })
  const saveButtons = () =>
    screen.getAllByRole('button', { name: /^(Guardar|Guardado)$/ })
  async function ready() {
    await screen.findByRole('heading', { name: article.title })
    await waitFor(() => expect(likeButtons()[0].disabled).toBe(false))
  }

  it('updates both positions when liking, unliking, saving or removing a save', async () => {
    renderApp()
    await ready()
    expect(likeButtons()).toHaveLength(2)
    expect(saveButtons()).toHaveLength(2)
    fireEvent.click(likeButtons()[1])
    await waitFor(() =>
      expect(
        likeButtons().every(
          (button) => button.getAttribute('aria-pressed') === 'true',
        ),
      ).toBe(true),
    )
    expect(mocks.addArticleLike).toHaveBeenCalledWith(article.id)
    expect(
      likeButtons().every((button) => button.textContent === 'Me gusta4'),
    ).toBe(true)
    expect(likeButtons()[0].querySelector('svg').getAttribute('fill')).toBe(
      'currentColor',
    )
    fireEvent.click(likeButtons()[0])
    await waitFor(() =>
      expect(
        likeButtons().every(
          (button) => button.getAttribute('aria-pressed') === 'false',
        ),
      ).toBe(true),
    )
    expect(mocks.removeArticleLike).toHaveBeenCalledWith(article.id)
    expect(likeButtons()[1].querySelector('svg').getAttribute('fill')).toBe(
      'none',
    )
    fireEvent.click(saveButtons()[1])
    await waitFor(() =>
      expect(
        saveButtons().every((button) => button.textContent === 'Guardado'),
      ).toBe(true),
    )
    fireEvent.click(saveButtons()[0])
    await waitFor(() =>
      expect(
        saveButtons().every((button) => button.textContent === 'Guardar'),
      ).toBe(true),
    )
    expect(mocks.addFavorite).toHaveBeenCalledWith(article.id)
    expect(mocks.removeFavorite).toHaveBeenCalledWith(article.id)
  })

  it('loads the signed-in reader state and resets it when the account changes', async () => {
    mocks.getArticleLikeState.mockResolvedValueOnce({ isLiked: true })
    mocks.getFavoriteState.mockResolvedValueOnce({ isFavorite: true })
    const view = renderApp()
    await ready()
    expect(
      likeButtons().every(
        (button) => button.getAttribute('aria-pressed') === 'true',
      ),
    ).toBe(true)
    expect(
      saveButtons().every((button) => button.textContent === 'Guardado'),
    ).toBe(true)
    auth.user = { id: 'another-reader' }
    auth.profile = { id: 'another-reader', name: 'Another reader' }
    view.rerender(appTree())
    await waitFor(() =>
      expect(mocks.getArticleLikeState).toHaveBeenCalledTimes(2),
    )
    await waitFor(() =>
      expect(
        likeButtons().every(
          (button) =>
            button.getAttribute('aria-pressed') === 'false' && !button.disabled,
        ),
      ).toBe(true),
    )
    expect(
      saveButtons().every((button) => button.textContent === 'Guardar'),
    ).toBe(true)
  })

  it('locks both copies during a request and preserves the outline on failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let rejectLike
    mocks.addArticleLike.mockImplementationOnce(
      () =>
        new Promise((resolve, reject) => {
          rejectLike = reject
        }),
    )
    renderApp()
    await ready()
    fireEvent.click(likeButtons()[0])
    expect(likeButtons().every((button) => button.disabled)).toBe(true)
    fireEvent.click(likeButtons()[1])
    expect(mocks.addArticleLike).toHaveBeenCalledTimes(1)
    await act(async () => rejectLike(new Error('Network unavailable')))
    await screen.findByRole('alert')
    expect(
      likeButtons().every(
        (button) =>
          !button.disabled && button.getAttribute('aria-pressed') === 'false',
      ),
    ).toBe(true)
    expect(likeButtons()[1].textContent).toBe('Me gusta3')
  })

  it('waits for the personal state and allows retrying it after a failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getFavoriteState.mockRejectedValueOnce(new Error('Unavailable'))
    renderApp()
    await screen.findByRole('alert')
    expect(saveButtons().every((button) => button.disabled)).toBe(true)
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('common.retry') }),
    )
    await ready()
    expect(saveButtons().every((button) => !button.disabled)).toBe(true)
  })

  it('lets the author save, and keeps self-likes unavailable in both positions', async () => {
    auth.user = { id: 'writer' }
    auth.profile = { id: 'writer', name: 'Author' }
    renderApp()
    await screen.findByRole('heading', { name: article.title })
    await waitFor(() => expect(saveButtons()[0].disabled).toBe(false))
    expect(likeButtons().every((button) => button.disabled)).toBe(true)
    expect(mocks.getArticleLikeState).not.toHaveBeenCalled()
    expect(screen.getByText(i18n.t('social.ownArticle')).id).toBe(
      'article-own-note',
    )
    fireEvent.click(likeButtons()[0])
    expect(mocks.addArticleLike).not.toHaveBeenCalled()
  })

  it('offers the same two actions as login links to anonymous readers', async () => {
    auth.isAuthenticated = false
    renderApp()
    await screen.findByRole('heading', { name: article.title })
    expect(
      screen.getAllByRole('link', { name: 'Guardar', exact: true }),
    ).toHaveLength(2)
    expect(
      screen
        .getAllByRole('link', { name: /^Me gusta/ })
        .every((link) => link.getAttribute('href') === '/login'),
    ).toBe(true)
    expect(mocks.getFavoriteState).not.toHaveBeenCalled()
    expect(mocks.getArticleLikeState).not.toHaveBeenCalled()
  })
})

it('shows only the category name in editorial type without the feed explanation', async () => {
  renderApp('/?category=design')
  const heading = await screen.findByRole('heading', {
    name: 'Historias para ti',
  })
  const header = heading.closest('header')
  await waitFor(() =>
    expect(
      header.querySelector('.public-home__active-category a')?.textContent,
    ).toBe('Diseño'),
  )
  expect(header.textContent).not.toContain('Categoría:')
  expect(header.textContent).not.toContain('Primero, las autoras')
})

const notificationFixture = (kind, index) => ({
  id: `notice-${index}`,
  kind,
  created_at: '2026-10-21T20:00:00Z',
  read_at: null,
  actor: { name: 'Reader', surname: String(index), username: `reader${index}` },
  article: {
    id: article.id,
    title: article.title,
    slug: article.slug,
    status: 'published',
    published_at: article.published_at,
    author: { username: 'Lau' },
  },
  comment:
    kind === 'comment'
      ? { content: 'Una mirada que invita a descubrir más.' }
      : null,
})
function inbox(notifications, page = 1, total = notifications.length) {
  return {
    notifications,
    unreadCount: 3,
    asOf: '2026-10-21T22:00:00Z',
    pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) },
  }
}
describe('Author notification inbox', () => {
  beforeEach(() => {
    mocks.getUnreadCount.mockResolvedValue({ count: 3 })
    mocks.getNotifications.mockResolvedValue(
      inbox(['like', 'save', 'comment'].map(notificationFixture)),
    )
  })
  it('shows the three kinds of incoming activity and the unread navbar badge', async () => {
    const { container } = renderApp('/dashboard/notifications')
    await screen.findByText('ha comentado tu artículo', { exact: false })
    expect(
      screen.getByText('ha guardado tu artículo', { exact: false }),
    ).toBeTruthy()
    expect(
      screen.getByText('le ha dado me gusta a tu artículo', { exact: false }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Notificaciones, 3 sin leer' }),
    ).toBeTruthy()
    expect(container.querySelector('.notification-count').textContent).toBe('3')
    expect(
      container.querySelectorAll('.notification-row--unread'),
    ).toHaveLength(3)
    expect(
      container.querySelectorAll('.notification-row')[2].getAttribute('href'),
    ).toBe('/Lau/story-one#comments')
  })
  it('marks an opened notification read and updates the shared count before navigation', async () => {
    const { container } = renderApp('/dashboard/notifications')
    await screen.findByText('ha comentado tu artículo', { exact: false })
    mocks.markNotificationRead.mockResolvedValueOnce({ count: 2 })
    fireEvent.click(container.querySelectorAll('.notification-row')[0])
    await screen.findByRole('heading', { name: article.title })
    expect(mocks.markNotificationRead).toHaveBeenCalledWith('notice-0')
    expect(
      screen.getByRole('link', { name: 'Notificaciones, 2 sin leer' }),
    ).toBeTruthy()
  })
  it('marks the inbox snapshot read without removing its history', async () => {
    const { container } = renderApp('/dashboard/notifications')
    await screen.findByText('ha comentado tu artículo', { exact: false })
    fireEvent.click(
      screen.getByRole('button', { name: 'Marcar todas como leídas' }),
    )
    await waitFor(() =>
      expect(
        container.querySelectorAll('.notification-row--unread'),
      ).toHaveLength(0),
    )
    expect(container.querySelectorAll('.notification-row')).toHaveLength(3)
    expect(mocks.markAllNotificationsRead).toHaveBeenCalledWith(
      '2026-10-21T22:00:00Z',
    )
    expect(container.querySelector('.notification-count')).toBeNull()
    expect(screen.getByText('Estás al día.')).toBeTruthy()
  })
  it('retains unread notices and the count if marking read fails', async () => {
    const { container } = renderApp('/dashboard/notifications')
    await screen.findByText('ha comentado tu artículo', { exact: false })
    mocks.markAllNotificationsRead.mockRejectedValueOnce(new Error('Offline'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Marcar todas como leídas' }),
    )
    await screen.findByRole('alert')
    expect(
      container.querySelectorAll('.notification-row--unread'),
    ).toHaveLength(3)
    expect(container.querySelector('.notification-count').textContent).toBe('3')
  })
  it('paginates the inbox and clears the previous results while the next page loads', async () => {
    mocks.getNotifications.mockResolvedValueOnce(
      inbox([notificationFixture('like', 0)], 1, 21),
    )
    const { container } = renderApp('/dashboard/notifications')
    await screen.findByText('le ha dado me gusta a tu artículo', {
      exact: false,
    })
    let resolvePage
    mocks.getNotifications.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve
        }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(container.querySelectorAll('.notification-row')).toHaveLength(0)
    await act(async () =>
      resolvePage(inbox([notificationFixture('comment', 2)], 2, 21)),
    )
    await screen.findByText('ha comentado tu artículo', { exact: false })
    expect(mocks.getNotifications).toHaveBeenLastCalledWith({
      page: 2,
      limit: 20,
    })
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()
  })
  it('never shows the prior account inbox after switching users', async () => {
    const view = renderApp('/dashboard/notifications')
    await screen.findByText('ha comentado tu artículo', { exact: false })
    let resolveInbox
    mocks.getNotifications.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInbox = resolve
        }),
    )
    auth.user = { id: 'another-user' }
    auth.profile = { id: 'another-user', name: 'Another' }
    view.rerender(appTree('/dashboard/notifications'))
    expect(view.container.querySelectorAll('.notification-row')).toHaveLength(0)
    await act(async () => resolveInbox({ ...inbox([]), unreadCount: 0 }))
    await screen.findByText('Todo en calma por aquí.')
  })
  it('refreshes the count when returning to the browser', async () => {
    renderApp('/')
    await screen.findByRole('link', { name: 'Notificaciones, 3 sin leer' })
    mocks.getUnreadCount.mockResolvedValueOnce({ count: 5 })
    fireEvent(window, new Event('focus'))
    await screen.findByRole('link', { name: 'Notificaciones, 5 sin leer' })
  })
  it('provides retry and an honest empty state', async () => {
    mocks.getNotifications.mockRejectedValueOnce(new Error('Offline'))
    renderApp('/dashboard/notifications')
    await screen.findByRole('alert')
    mocks.getNotifications.mockResolvedValueOnce({
      ...inbox([]),
      unreadCount: 0,
    })
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('common.retry') }),
    )
    await screen.findByText('Todo en calma por aquí.')
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('redirects anonymous visitors and hides the private navbar entry', async () => {
    auth.isAuthenticated = false
    const { container } = renderApp('/dashboard/notifications')
    await screen.findByRole('heading', { name: 'Iniciar sesión' })
    expect(container.querySelector('.notification-link')).toBeNull()
    expect(mocks.getNotifications).not.toHaveBeenCalled()
    expect(mocks.getUnreadCount).not.toHaveBeenCalled()
  })
})
