import { randomUUID } from 'node:crypto'

import { supabaseAdmin } from '../config/supabase.js'

const ARTICLE_COVERS_BUCKET = 'article-covers'

function getStoragePathFromPublicUrl(publicUrl) {
  if (!publicUrl) {
    return null
  }

  try {
    const url = new URL(publicUrl)

    const pathPrefix = `/storage/v1/object/public/${ARTICLE_COVERS_BUCKET}/`

    const prefixIndex = url.pathname.indexOf(pathPrefix)

    if (prefixIndex === -1) {
      return null
    }

    const encodedPath = url.pathname.slice(prefixIndex + pathPrefix.length)

    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}

export async function uploadArticleCover({ userId, file }) {
  const fileName = `${randomUUID()}.${file.detectedExtension}`
  const filePath = `${userId}/${fileName}`

  const { error } = await supabaseAdmin.storage
    .from(ARTICLE_COVERS_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.detectedMimeType,
      upsert: false,
    })

  if (error) {
    throw new Error('Unable to upload article cover.', {
      cause: error,
    })
  }

  const { data } = supabaseAdmin.storage
    .from(ARTICLE_COVERS_BUCKET)
    .getPublicUrl(filePath)

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  }
}

export async function deleteArticleCover(filePath) {
  if (!filePath) {
    return
  }

  const { error } = await supabaseAdmin.storage
    .from(ARTICLE_COVERS_BUCKET)
    .remove([filePath])

  if (error) {
    throw new Error('Unable to delete article cover.', {
      cause: error,
    })
  }
}

export async function deleteArticleCoverByPublicUrl(publicUrl) {
  const filePath = getStoragePathFromPublicUrl(publicUrl)

  if (!filePath) {
    return false
  }

  await deleteArticleCover(filePath)

  return true
}
