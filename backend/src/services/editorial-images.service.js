import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { supabaseAdmin } from '../config/supabase.js'

const BUCKET = 'article-covers'
export async function prepareEditorialImage(buffer) {
  try {
    const pipeline = sharp(buffer, {
      limitInputPixels: 40_000_000,
      animated: false,
    }).rotate()
    const large = await pipeline
      .clone()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    const small = await pipeline
      .clone()
      .resize({
        width: 640,
        height: 640,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true })
    return { large, small }
  } catch {
    const error = new Error(
      'Unable to decode image. Use a JPEG, PNG or WebP up to 40 megapixels.',
    )
    error.name = 'EditorialImageError'
    error.status = 400
    throw error
  }
}
export async function storeEditorialImage(userId, buffer) {
  const { large, small } = await prepareEditorialImage(buffer)
  const base = `${userId}/${randomUUID()}`
  const path = `${base}-1600.webp`
  const thumbnailPath = `${base}-640.webp`
  const stored = []
  try {
    for (const [filePath, bytes] of [
      [path, large.data],
      [thumbnailPath, small.data],
    ]) {
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filePath, bytes, {
          contentType: 'image/webp',
          upsert: false,
          cacheControl: '31536000',
        })
      if (error) throw error
      stored.push(filePath)
    }
  } catch (error) {
    if (stored.length) await supabaseAdmin.storage.from(BUCKET).remove(stored)
    throw error
  }
  const publicUrl = (p) =>
    supabaseAdmin.storage.from(BUCKET).getPublicUrl(p).data.publicUrl
  return {
    path,
    thumbnailPath,
    publicUrl: publicUrl(path),
    thumbnailUrl: publicUrl(thumbnailPath),
    width: large.info.width,
    height: large.info.height,
    thumbnailWidth: small.info.width,
  }
}
export async function removeEditorialImages(paths, userId) {
  paths = paths.filter(
    (path) =>
      typeof path === 'string' &&
      path.startsWith(`${userId}/`) &&
      /^[\da-f-]+\/[\da-f-]+-(1600|640)\.webp$/i.test(path),
  )
  if (!paths.length) return
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths)
  if (error) console.error('Unable to clean up editorial image files:', error)
}
