import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  findOwnedArticleById: vi.fn(),
  findGallery: vi.fn(),
  findGalleryImage: vi.fn(),
  insertGalleryImage: vi.fn(),
  updateGalleryImage: vi.fn(),
  deleteGalleryImage: vi.fn(),
  storeEditorialImage: vi.fn(),
  removeEditorialImages: vi.fn(),
}))
vi.mock('../src/repositories/articles.repository.js', () => ({
  findOwnedArticleById: mocks.findOwnedArticleById,
}))
vi.mock('../src/repositories/galleries.repository.js', () => mocks)
vi.mock('../src/config/supabase.js', () => ({ supabasePublic: {} }))
vi.mock('../src/services/editorial-images.service.js', () => mocks)
import {
  addGalleryImage,
  editGalleryImage,
  removeGalleryImage,
} from '../src/services/galleries.service.js'
const input = {
  accessToken: 'token',
  userId: 'owner',
  articleId: 'article',
  altText: 'An editorial image',
  caption: 'Image credit',
  file: { buffer: Buffer.from('image') },
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.findOwnedArticleById.mockResolvedValue({
    id: 'article',
    author_id: 'owner',
  })
  mocks.findGallery.mockResolvedValue([])
  mocks.storeEditorialImage.mockResolvedValue({
    path: 'large',
    thumbnailPath: 'small',
    publicUrl: 'image',
    thumbnailUrl: 'thumb',
    width: 1600,
    height: 1000,
    thumbnailWidth: 640,
  })
  mocks.insertGalleryImage.mockResolvedValue({ id: 'new' })
  mocks.findGalleryImage.mockResolvedValue({
    id: 'image',
    owner_id: 'owner',
    storage_path: 'large',
    thumbnail_path: 'small',
  })
})
describe('Gallery ownership and upload lifecycle', () => {
  it('checks ownership before uploading article files', async () => {
    mocks.findOwnedArticleById.mockResolvedValue(null)
    await expect(addGalleryImage(input)).rejects.toMatchObject({ status: 404 })
    expect(mocks.storeEditorialImage).not.toHaveBeenCalled()
  })
  it('does not create orphan files after reaching the gallery limit', async () => {
    mocks.findGallery.mockResolvedValue(Array(12).fill({ id: 'x' }))
    await expect(addGalleryImage(input)).rejects.toMatchObject({ status: 409 })
    expect(mocks.storeEditorialImage).not.toHaveBeenCalled()
  })
  it('cleans up both image variants when the row cannot be saved', async () => {
    mocks.insertGalleryImage.mockRejectedValue(new Error('Database failed'))
    await expect(addGalleryImage(input)).rejects.toThrow('Database failed')
    expect(mocks.removeEditorialImages).toHaveBeenCalledWith(
      ['large', 'small'],
      'owner',
    )
  })
  it('maps a concurrent quota rejection to a conflict and cleans files', async () => {
    mocks.insertGalleryImage.mockRejectedValue({ code: 'P0001' })
    await expect(addGalleryImage(input)).rejects.toMatchObject({ status: 409 })
    expect(mocks.removeEditorialImages).toHaveBeenCalled()
  })
  it('persists both resolutions with the authenticated owner', async () => {
    await expect(addGalleryImage(input)).resolves.toEqual({ id: 'new' })
    expect(mocks.insertGalleryImage).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({
        owner_id: 'owner',
        article_id: 'article',
        alt_text: input.altText,
        caption: input.caption,
        thumbnail_width: 640,
      }),
    )
  })
  it.each([editGalleryImage, removeGalleryImage])(
    'rejects editing or deleting another owner image',
    async (action) => {
      mocks.findGalleryImage.mockResolvedValue({ owner_id: 'someone-else' })
      await expect(
        action({
          accessToken: 'token',
          userId: 'owner',
          id: 'image',
          altText: 'test',
          caption: '',
        }),
      ).rejects.toMatchObject({ status: 404 })
      expect(mocks.updateGalleryImage).not.toHaveBeenCalled()
      expect(mocks.deleteGalleryImage).not.toHaveBeenCalled()
      expect(mocks.removeEditorialImages).not.toHaveBeenCalled()
    },
  )
  it('removes files only after deleting the owned database record', async () => {
    await removeGalleryImage({
      accessToken: 'token',
      userId: 'owner',
      id: 'image',
    })
    expect(mocks.deleteGalleryImage).toHaveBeenCalledWith(
      'token',
      'image',
      'owner',
    )
    expect(mocks.removeEditorialImages).toHaveBeenCalledWith(
      ['large', 'small'],
      'owner',
    )
  })
})
