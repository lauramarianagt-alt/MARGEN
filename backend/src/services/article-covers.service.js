import { env } from '../config/env.js'
import { storeEditorialImage } from './editorial-images.service.js'

import { supabaseAdmin } from '../config/supabase.js'

const ARTICLE_COVERS_BUCKET = 'article-covers'

function getStoragePathFromPublicUrl(publicUrl, userId) {
  if (!publicUrl) {
    return null
  }

  try {
    const url = new URL(publicUrl)
    if (!userId || url.origin !== new URL(env.supabaseUrl).origin) return null

    const pathPrefix = `/storage/v1/object/public/${ARTICLE_COVERS_BUCKET}/`

    const prefixIndex = url.pathname.indexOf(pathPrefix)

    if (prefixIndex === -1) {
      return null
    }

    const encodedPath = url.pathname.slice(prefixIndex + pathPrefix.length)

    const path = decodeURIComponent(encodedPath)
    if (
      !path.startsWith(`${userId}/`) ||
      !/^[\da-f-]+\/[a-z0-9][a-z0-9._-]*$/i.test(path)
    )
      return null
    return path
  } catch {
    return null
  }
}

export async function uploadArticleCover({ userId, file }) {
  const stored = await storeEditorialImage(userId, file.buffer)
  return {
    path: stored.path,
    publicUrl: stored.publicUrl,
    variants: [
      { url: stored.thumbnailUrl, width: stored.thumbnailWidth },
      { url: stored.publicUrl, width: stored.width },
    ].filter(
      (item, index, list) =>
        list.findIndex((other) => other.width === item.width) === index,
    ),
  }
}

export async function deleteArticleCover(filePath) {
  if (!filePath) {
    return
  }

  const { error } = await supabaseAdmin.storage
    .from(ARTICLE_COVERS_BUCKET)
    .remove(
      filePath.endsWith('-1600.webp')
        ? [filePath, filePath.replace('-1600.webp', '-640.webp')]
        : [filePath],
    )

  if (error) {
    throw new Error('Unable to delete article cover.', {
      cause: error,
    })
  }
}

export async function deleteArticleCoverByPublicUrl(publicUrl, userId) {
  const filePath = getStoragePathFromPublicUrl(publicUrl, userId)

  if (!filePath) {
    return false
  }

  await deleteArticleCover(filePath)

  return true
}
