import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  addGalleryImage: vi.fn(),
  editGalleryImage: vi.fn(),
  removeGalleryImage: vi.fn(),
  listOwnGallery: vi.fn(),
  listPublicArticleGallery: vi.fn(),
  getUser: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}))
vi.mock('../src/services/galleries.service.js', () => ({
  ...mocks,
  GalleryError: class extends Error {
    constructor(status, message) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('../src/config/supabase.js', () => ({
  supabasePublic: { auth: { getUser: mocks.getUser } },
  supabaseAdmin: {},
  createSupabaseUserClient: () => ({ from: () => ({ update: mocks.update }) }),
}))
import app from '../src/app.js'
const articleId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const imageId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
const owner = '11111111-1111-4111-8111-111111111111'
const cookie = 'margen_access_token=test-token'
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lRkAAAAASUVORK5CYII=',
  'base64',
)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({
    data: { user: { id: owner } },
    error: null,
  })
  mocks.listOwnGallery.mockResolvedValue([])
  mocks.listPublicArticleGallery.mockResolvedValue([])
  mocks.addGalleryImage.mockResolvedValue({ id: imageId })
  mocks.editGalleryImage.mockResolvedValue({ id: imageId })
  mocks.removeGalleryImage.mockResolvedValue(undefined)
  mocks.update.mockReturnValue({ eq: mocks.eq })
  mocks.eq.mockReturnValue({ select: mocks.select })
  mocks.select.mockReturnValue({ single: mocks.single })
  mocks.single.mockResolvedValue({
    data: {
      id: owner,
      name: 'Laura',
      surname: 'Guillén',
      bio: 'Fashion and image',
    },
    error: null,
  })
})
describe('Gallery and profile API', () => {
  it.each(['/api/me/gallery', '/api/me/profile'])(
    'requires a session for %s',
    async (path) => {
      const response = path.endsWith('profile')
        ? await request(app).patch(path).send({})
        : await request(app).get(path)
      expect(response.status).toBe(401)
    },
  )
  it('routes public article galleries before the generic article detail route', async () => {
    const response = await request(app).get(
      `/api/articles/${articleId}/gallery`,
    )
    expect(response.status).toBe(200)
    expect(mocks.listPublicArticleGallery).toHaveBeenCalledWith(articleId)
  })
  it('requires an article for private galleries', async () => {
    const response = await request(app)
      .get('/api/me/gallery')
      .set('Cookie', cookie)
    expect(response.status).toBe(400)
    expect(mocks.listOwnGallery).not.toHaveBeenCalled()
  })
  it('rejects invalid article IDs before querying a private gallery', async () => {
    const response = await request(app)
      .get('/api/me/gallery?articleId=invalid')
      .set('Cookie', cookie)
    expect(response.status).toBe(400)
    expect(mocks.listOwnGallery).not.toHaveBeenCalled()
  })
  it('accepts a real PNG and derives owner identity from the session', async () => {
    const response = await request(app)
      .post('/api/me/gallery')
      .set('Cookie', cookie)
      .field('articleId', articleId)
      .field('altText', 'A fabric study')
      .field('caption', 'Image credit')
      .attach('image', png, { filename: 'study.png', contentType: 'image/png' })
    expect(response.status).toBe(201)
    expect(mocks.addGalleryImage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: owner,
        articleId,
        altText: 'A fabric study',
      }),
    )
  })
  it('rejects text disguised as a JPEG', async () => {
    const response = await request(app)
      .post('/api/me/gallery')
      .set('Cookie', cookie)
      .field('altText', 'A fake image')
      .attach('image', Buffer.from('not an image'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      })
    expect(response.status).toBe(400)
    expect(mocks.addGalleryImage).not.toHaveBeenCalled()
  })
  it('requires a meaningful image description', async () => {
    const response = await request(app)
      .post('/api/me/gallery')
      .set('Cookie', cookie)
      .field('articleId', articleId)
      .field('altText', '   ')
      .attach('image', png, { filename: 'study.png', contentType: 'image/png' })
    expect(response.status).toBe(400)
    expect(mocks.addGalleryImage).not.toHaveBeenCalled()
  })
  it('rejects oversized uploads', async () => {
    const response = await request(app)
      .post('/api/me/gallery')
      .set('Cookie', cookie)
      .field('altText', 'Large image')
      .attach('image', Buffer.alloc(6 * 1024 * 1024 + 1), {
        filename: 'large.png',
        contentType: 'image/png',
      })
    expect(response.status).toBe(413)
  })
  it('deletes a gallery image through the authenticated owner service', async () => {
    const response = await request(app)
      .delete(`/api/me/gallery/${imageId}`)
      .set('Cookie', cookie)
    expect(response.status).toBe(204)
    expect(mocks.removeGalleryImage).toHaveBeenCalledWith({
      accessToken: 'test-token',
      userId: owner,
      id: imageId,
    })
  })
  it('updates only the authenticated public profile', async () => {
    const response = await request(app)
      .patch('/api/me/profile')
      .set('Cookie', cookie)
      .send({ name: 'Laura', surname: 'Guillén', bio: 'Fashion and image' })
    expect(response.status).toBe(200)
    expect(mocks.eq).toHaveBeenCalledWith('id', owner)
  })
  it.each([
    { username: 'new-name' },
    { id: 'another-owner' },
    { email: 'new@example.test' },
  ])(
    'rejects account and ownership fields on the biography endpoint',
    async (extra) => {
      const response = await request(app)
        .patch('/api/me/profile')
        .set('Cookie', cookie)
        .send({ name: 'Laura', surname: 'Guillén', bio: '', ...extra })
      expect(response.status).toBe(400)
      expect(mocks.update).not.toHaveBeenCalled()
    },
  )
})
