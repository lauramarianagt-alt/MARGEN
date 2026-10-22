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
import { MemoryRouter } from 'react-router-dom'
import i18n from '../src/i18n/index.js'
import GalleryCarousel from '../src/components/gallery/GalleryCarousel.jsx'
import GalleryManager from '../src/components/gallery/GalleryManager.jsx'
import PublicGallery from '../src/components/gallery/PublicGallery.jsx'
import ProfilePage from '../src/pages/ProfilePage.jsx'
const mocks = vi.hoisted(() => ({
  getPublicGallery: vi.fn(),
  getOwnGallery: vi.fn(),
  uploadGalleryImage: vi.fn(),
  updateGalleryImage: vi.fn(),
  deleteGalleryImage: vi.fn(),
  updateProfile: vi.fn(),
}))
vi.mock('../src/services/galleries.service.js', () => mocks)
vi.mock('../src/hooks/useAuth.js', () => ({
  useAuth: () => ({
    profile: {
      username: 'Lau',
      name: 'Laura',
      surname: 'Guillén',
      bio: 'Original bio',
    },
    updateProfile: mocks.updateProfile,
  }),
}))
const images = Array.from({ length: 3 }, (_, i) => ({
  id: `image-${i}`,
  image_url: `/image-${i}.webp`,
  thumbnail_url: `/thumb-${i}.webp`,
  width: 1600,
  height: 1000,
  thumbnail_width: 640,
  alt_text: `Detalle de tejido ${i + 1}`,
  caption: `Créditos ${i + 1}`,
}))
beforeEach(async () => {
  vi.resetAllMocks()
  await i18n.changeLanguage('es')
  mocks.getOwnGallery.mockResolvedValue({ images: [] })
  mocks.getPublicGallery.mockResolvedValue({ images: [] })
  mocks.uploadGalleryImage.mockResolvedValue({ image: images[0] })
  mocks.updateGalleryImage.mockResolvedValue({ image: images[0] })
  mocks.deleteGalleryImage.mockResolvedValue(undefined)
  mocks.updateProfile.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('Accessible editorial galleries', () => {
  it('navigates with buttons and keeps image description and caption together', () => {
    render(<GalleryCarousel images={images} />)
    expect(
      screen.getByRole('button', { name: 'Imagen anterior' }).disabled,
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }))
    expect(screen.getByAltText('Detalle de tejido 2')).toBeTruthy()
    expect(screen.getByText('Créditos 2')).toBeTruthy()
    expect(screen.getByText('2 / 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver imagen 3' }))
    expect(
      screen.getByRole('button', { name: 'Imagen siguiente' }).disabled,
    ).toBe(true)
  })
  it('supports arrow keys, Home and End without moving beyond the gallery', () => {
    render(<GalleryCarousel images={images} />)
    const gallery = screen.getByRole('region', {
      name: 'La historia en imágenes',
    })
    fireEvent.keyDown(gallery, { key: 'End' })
    expect(screen.getByAltText('Detalle de tejido 3')).toBeTruthy()
    fireEvent.keyDown(gallery, { key: 'ArrowRight' })
    expect(screen.getByText('3 / 3')).toBeTruthy()
    fireEvent.keyDown(gallery, { key: 'ArrowLeft' })
    expect(screen.getByText('2 / 3')).toBeTruthy()
    fireEvent.keyDown(gallery, { key: 'Home' })
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })
  it('supports a horizontal touch gesture', () => {
    render(<GalleryCarousel images={images} />)
    const gallery = screen.getByRole('region')
    fireEvent.touchStart(gallery, { touches: [{ clientX: 200 }] })
    fireEvent.touchEnd(gallery, { changedTouches: [{ clientX: 50 }] })
    expect(screen.getByText('2 / 3')).toBeTruthy()
  })
  it('avoids redundant controls for one image and hides an empty gallery', () => {
    const { rerender } = render(<GalleryCarousel images={[images[0]]} />)
    expect(screen.queryByRole('button')).toBeNull()
    rerender(<GalleryCarousel images={[]} />)
    expect(screen.queryByRole('region')).toBeNull()
  })
  it('advances the opening banner every six seconds, wraps, and keeps the current caption', () => {
    vi.useFakeTimers()
    const { container } = render(
      <GalleryCarousel images={images} banner autoPlay />,
    )
    expect(screen.getByText('1 / 3')).toBeTruthy()
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(screen.getByText('Créditos 2')).toBeTruthy()
    expect(
      container.querySelector(
        '.gallery-carousel__slide[aria-hidden="false"] img',
      ).alt,
    ).toBe('Detalle de tejido 2')
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('3 / 3')).toBeTruthy()
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('1 / 3')).toBeTruthy()
  })
  it('pauses automatic rotation while allowing manual navigation and resumes on request', () => {
    vi.useFakeTimers()
    render(<GalleryCarousel images={images} banner autoPlay />)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar galería' }))
    act(() => vi.advanceTimersByTime(12000))
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Imagen anterior' }))
    expect(screen.getByText('3 / 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Imagen siguiente' }))
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.focus(screen.getByRole('button', { name: 'Reproducir galería' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir galería' }))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('2 / 3')).toBeTruthy()
  })
  it('holds rotation during hover and keyboard focus and does not capture button arrow keys', () => {
    vi.useFakeTimers()
    render(<GalleryCarousel images={images} banner autoPlay />)
    const gallery = screen.getByRole('region')
    fireEvent.mouseEnter(gallery)
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.mouseLeave(gallery)
    fireEvent.focus(screen.getByRole('button', { name: 'Imagen siguiente' }))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Imagen siguiente' }),
      { key: 'ArrowRight' },
    )
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.blur(screen.getByRole('button', { name: 'Imagen siguiente' }), {
      relatedTarget: document.body,
    })
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByText('2 / 3')).toBeTruthy()
  })
  it('starts paused for reduced motion and ignores vertical scrolling or cancelled swipes', () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    render(<GalleryCarousel images={images} banner autoPlay />)
    expect(
      screen.getByRole('button', { name: 'Reproducir galería' }),
    ).toBeTruthy()
    act(() => vi.advanceTimersByTime(12000))
    const gallery = screen.getByRole('region')
    fireEvent.touchStart(gallery, { touches: [{ clientX: 200, clientY: 10 }] })
    fireEvent.touchEnd(gallery, {
      changedTouches: [{ clientX: 130, clientY: 200 }],
    })
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.touchStart(gallery, { touches: [{ clientX: 200, clientY: 10 }] })
    fireEvent.touchCancel(gallery)
    fireEvent.touchEnd(gallery, {
      changedTouches: [{ clientX: 50, clientY: 10 }],
    })
    expect(screen.getByText('1 / 3')).toBeTruthy()
    fireEvent.touchStart(gallery, { touches: [{ clientX: 200, clientY: 10 }] })
    fireEvent.touchEnd(gallery, {
      changedTouches: [{ clientX: 50, clientY: 10 }],
    })
    expect(screen.getByText('2 / 3')).toBeTruthy()
  })
  it('retains the cover when the gallery fails and replaces it after a successful retry', async () => {
    const coverArticle = {
      id: 'story',
      title: 'Una historia',
      cover_image_url: '/cover.webp',
    }
    mocks.getPublicGallery.mockRejectedValueOnce(new Error('Offline'))
    const { container } = render(<PublicGallery article={coverArticle} />)
    expect(screen.getByAltText('Una historia')).toBeTruthy()
    await screen.findByText('No hemos podido cargar la galería.')
    mocks.getPublicGallery.mockResolvedValueOnce({ images })
    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    await screen.findByRole('region', { name: 'La historia en imágenes' })
    expect(container.querySelector('.public-article__cover')).toBeNull()
    expect(screen.queryByAltText('Una historia')).toBeNull()
  })
  it('retains the original cover when an article has no gallery', async () => {
    render(
      <PublicGallery
        article={{
          id: 'story',
          title: 'Sin galería',
          cover_image_url: '/cover.webp',
        }}
      />,
    )
    await waitFor(() =>
      expect(mocks.getPublicGallery).toHaveBeenCalledWith('story'),
    )
    expect(screen.getByAltText('Sin galería')).toBeTruthy()
    expect(screen.queryByRole('region')).toBeNull()
  })
  it('uploads the description, credits and selected image to the correct article', async () => {
    render(<GalleryManager articleId="article-one" />)
    await screen.findByText('Empieza con una imagen que cuente algo.')
    const file = new File(['image'], 'study.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), {
      target: { files: [file] },
    })
    fireEvent.change(screen.getByLabelText('Descripción de la imagen'), {
      target: { value: 'Una costura visible' },
    })
    fireEvent.change(
      screen.getByLabelText('Pie de foto y créditos (opcional)'),
      { target: { value: 'Imagen generada con IA' } },
    )
    fireEvent.submit(
      screen.getByLabelText('Seleccionar imagen').closest('form'),
    )
    await waitFor(() =>
      expect(mocks.uploadGalleryImage).toHaveBeenCalledWith({
        articleId: 'article-one',
        file,
        altText: 'Una costura visible',
        caption: 'Imagen generada con IA',
      }),
    )
    expect(await screen.findByAltText('Detalle de tejido 1')).toBeTruthy()
  })
  it('keeps the upload text after a failed request', async () => {
    mocks.uploadGalleryImage.mockRejectedValue({ status: 500 })
    render(<GalleryManager articleId="article-one" />)
    await screen.findByText('Empieza con una imagen que cuente algo.')
    fireEvent.change(screen.getByLabelText('Seleccionar imagen'), {
      target: {
        files: [new File(['image'], 'study.png', { type: 'image/png' })],
      },
    })
    fireEvent.change(screen.getByLabelText('Descripción de la imagen'), {
      target: { value: 'Texto que debe conservarse' },
    })
    fireEvent.submit(
      screen.getByLabelText('Seleccionar imagen').closest('form'),
    )
    await screen.findByRole('alert')
    expect(screen.getByLabelText('Descripción de la imagen').value).toBe(
      'Texto que debe conservarse',
    )
  })
  it('requires confirmation before deleting an image', async () => {
    mocks.getOwnGallery.mockResolvedValue({ images: [images[0]] })
    render(<GalleryManager articleId="article-one" />)
    await screen.findByAltText('Detalle de tejido 1')
    fireEvent.click(
      screen.getByRole('button', { name: 'Eliminar', exact: true }),
    )
    expect(mocks.deleteGalleryImage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar imagen' }))
    await waitFor(() =>
      expect(mocks.deleteGalleryImage).toHaveBeenCalledWith('image-0'),
    )
  })
  it('saves profile details without changing the account URL or credentials', async () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Biografía'), {
      target: { value: 'Una nueva mirada sobre la moda.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        name: 'Laura',
        surname: 'Guillén',
        bio: 'Una nueva mirada sobre la moda.',
      }),
    )
    expect(await screen.findByText('Tu perfil se ha actualizado.')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: /Ver mi perfil público/ })
        .getAttribute('href'),
    ).toBe('/Lau')
  })
})
