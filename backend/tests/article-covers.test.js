import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ remove: vi.fn(), store: vi.fn() }))
vi.mock('../src/config/env.js', () => ({
  env: { supabaseUrl: 'https://project.supabase.co' },
}))
vi.mock('../src/config/supabase.js', () => ({
  supabaseAdmin: { storage: { from: () => ({ remove: mocks.remove }) } },
}))
vi.mock('../src/services/editorial-images.service.js', () => ({
  storeEditorialImage: mocks.store,
}))
import { deleteArticleCoverByPublicUrl } from '../src/services/article-covers.service.js'
const owner = '11111111-1111-4111-8111-111111111111'
const prefix =
  'https://project.supabase.co/storage/v1/object/public/article-covers/'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.remove.mockResolvedValue({ error: null })
})
describe('Cover storage ownership', () => {
  it('removes both resolutions for the owned current cover', async () => {
    const path = `${owner}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-1600.webp`
    expect(await deleteArticleCoverByPublicUrl(prefix + path, owner)).toBe(true)
    expect(mocks.remove).toHaveBeenCalledWith([
      path,
      path.replace('-1600', '-640'),
    ])
  })
  it('removes an owned legacy cover', async () => {
    expect(
      await deleteArticleCoverByPublicUrl(
        prefix + owner + '/editorial-old.png',
        owner,
      ),
    ).toBe(true)
    expect(mocks.remove).toHaveBeenCalledWith([owner + '/editorial-old.png'])
  })
  it.each([
    `${prefix}22222222-2222-4222-8222-222222222222/cover.png`,
    `https://foreign.example/storage/v1/object/public/article-covers/${owner}/cover.png`,
    `${prefix}${owner}/nested%2Fcover.png`,
  ])(
    'preserves files when the supplied cover URL does not belong to the author and project',
    async (url) => {
      expect(await deleteArticleCoverByPublicUrl(url, owner)).toBe(false)
      expect(mocks.remove).not.toHaveBeenCalled()
    },
  )
})
