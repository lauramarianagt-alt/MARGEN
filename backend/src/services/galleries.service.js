import { randomUUID } from 'node:crypto'
import { findOwnedArticleById } from '../repositories/articles.repository.js'
import { supabasePublic } from '../config/supabase.js'
import {
  findGallery,
  findGalleryImage,
  insertGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
} from '../repositories/galleries.repository.js'
import {
  storeEditorialImage,
  removeEditorialImages,
} from './editorial-images.service.js'
export class GalleryError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
async function requireOwnedArticle(accessToken, userId, articleId) {
  if (!(await findOwnedArticleById(accessToken, articleId, userId)))
    throw new GalleryError(404, 'Article not found')
}
export async function listOwnGallery({ accessToken, userId, articleId }) {
  await requireOwnedArticle(accessToken, userId, articleId)
  return findGallery({ accessToken, ownerId: userId, articleId })
}
export async function listPublicArticleGallery(articleId) {
  const { data, error } = await supabasePublic
    .from('articles')
    .select('author_id')
    .eq('id', articleId)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
  if (error) throw error
  if (!data) throw new GalleryError(404, 'Article not found')
  return findGallery({ ownerId: data.author_id, articleId })
}
export async function addGalleryImage({
  accessToken,
  userId,
  articleId,
  altText,
  caption = '',
  file,
}) {
  if (!file) throw new GalleryError(400, 'Image required')
  const images = await listOwnGallery({ accessToken, userId, articleId })
  if (images.length >= 12) throw new GalleryError(409, 'Gallery limit reached')
  const stored = await storeEditorialImage(userId, file.buffer)
  try {
    return await insertGalleryImage(accessToken, {
      id: randomUUID(),
      owner_id: userId,
      article_id: articleId,
      image_url: stored.publicUrl,
      thumbnail_url: stored.thumbnailUrl,
      storage_path: stored.path,
      thumbnail_path: stored.thumbnailPath,
      width: stored.width,
      height: stored.height,
      thumbnail_width: stored.thumbnailWidth,
      alt_text: altText,
      caption,
    })
  } catch (error) {
    await removeEditorialImages([stored.path, stored.thumbnailPath], userId)
    if (error.code === 'P0001')
      throw new GalleryError(409, 'Gallery limit reached')
    throw error
  }
}
async function requireOwnedImage(accessToken, userId, id) {
  const image = await findGalleryImage(accessToken, id)
  if (!image || image.owner_id !== userId)
    throw new GalleryError(404, 'Image not found')
  return image
}
export async function editGalleryImage({
  accessToken,
  userId,
  id,
  altText,
  caption,
}) {
  await requireOwnedImage(accessToken, userId, id)
  return updateGalleryImage(accessToken, id, userId, {
    alt_text: altText,
    caption,
  })
}
export async function removeGalleryImage({ accessToken, userId, id }) {
  const image = await requireOwnedImage(accessToken, userId, id)
  await deleteGalleryImage(accessToken, id, userId)
  await removeEditorialImages(
    [image.storage_path, image.thumbnail_path],
    userId,
  )
}
