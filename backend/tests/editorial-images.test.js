import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
const storage = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  getPublicUrl: vi.fn(),
}))
vi.mock('../src/config/supabase.js', () => ({
  supabaseAdmin: { storage: { from: () => storage } },
}))
import {
  prepareEditorialImage,
  storeEditorialImage,
  removeEditorialImages,
} from '../src/services/editorial-images.service.js'
const user = '11111111-1111-4111-8111-111111111111'
beforeEach(() => {
  vi.resetAllMocks()
  storage.upload.mockResolvedValue({ error: null })
  storage.remove.mockResolvedValue({ error: null })
  storage.getPublicUrl.mockImplementation((path) => ({
    data: { publicUrl: `https://example.test/${path}` },
  }))
})
describe('Editorial image processing', () => {
  it('produces two WebP sizes without enlarging small originals', async () => {
    const bytes = await sharp({
      create: { width: 2000, height: 1200, channels: 3, background: '#b4ada0' },
    })
      .png()
      .toBuffer()
    const result = await prepareEditorialImage(bytes)
    expect(result.large.info).toMatchObject({
      width: 1600,
      height: 960,
      format: 'webp',
    })
    expect(result.small.info).toMatchObject({
      width: 640,
      height: 384,
      format: 'webp',
    })
    const tiny = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer()
    expect((await prepareEditorialImage(tiny)).large.info.width).toBe(100)
  })
  it('cleans the first variant if the second upload fails', async () => {
    storage.upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('Upload failed') })
    const bytes = await sharp({
      create: { width: 100, height: 100, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer()
    await expect(storeEditorialImage(user, bytes)).rejects.toThrow(
      'Upload failed',
    )
    expect(storage.remove).toHaveBeenCalledWith([
      expect.stringMatching(/-1600\.webp$/),
    ])
  })
  it('refuses to delete paths belonging to another user or containing traversal', async () => {
    const valid = `${user}/22222222-2222-4222-8222-222222222222-1600.webp`
    await removeEditorialImages(
      [valid, 'other/22222222-1600.webp', `${user}/../other-1600.webp`],
      user,
    )
    expect(storage.remove).toHaveBeenCalledWith([valid])
  })
})
