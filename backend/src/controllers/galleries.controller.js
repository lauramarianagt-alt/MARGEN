import { z } from 'zod'
import {
  addGalleryImage,
  editGalleryImage,
  removeGalleryImage,
  listOwnGallery,
  listPublicArticleGallery,
  GalleryError,
} from '../services/galleries.service.js'
const imageText = z.object({
  altText: z.string().trim().min(1).max(300),
  caption: z.string().trim().max(300).default(''),
})
const uploadSchema = imageText.extend({ articleId: z.uuid() })
export const galleryQuerySchema = z.object({ articleId: z.uuid() })
function endpoint(schema, source, action, status = 200) {
  return async (req, res) => {
    const validation = schema.safeParse(req[source])
    if (!validation.success)
      return res.status(400).json({ error: 'Invalid gallery data' })
    try {
      const result = await action(req, validation.data)
      return status === 204
        ? res.status(204).send()
        : res.status(status).json(result)
    } catch (error) {
      if (error instanceof GalleryError || error.name === 'EditorialImageError')
        return res.status(error.status).json({ error: error.message })
      console.error('Gallery request failed:', error)
      return res.status(500).json({ error: 'Unable to update gallery' })
    }
  }
}
const identity = (req) => ({
  accessToken: req.accessToken,
  userId: req.user.id,
})
export const ownGallery = endpoint(
  galleryQuerySchema,
  'query',
  async (req, input) => ({
    images: await listOwnGallery({ ...identity(req), ...input }),
  }),
)
export const articleGallery = endpoint(
  z.object({ id: z.uuid() }),
  'params',
  async (req, { id }) => ({ images: await listPublicArticleGallery(id) }),
)
export const createImage = endpoint(
  uploadSchema,
  'body',
  async (req, input) => ({
    image: await addGalleryImage({
      ...identity(req),
      ...input,
      file: req.file,
    }),
  }),
  201,
)
export const changeImage = async (req, res, next) => {
  if (!z.uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: 'Invalid image ID' })
  return endpoint(imageText, 'body', async (req, input) => ({
    image: await editGalleryImage({
      ...identity(req),
      ...input,
      id: req.params.id,
    }),
  }))(req, res, next)
}
export const removeImage = endpoint(
  z.object({ id: z.uuid() }),
  'params',
  async (req, { id }) => removeGalleryImage({ ...identity(req), id }),
  204,
)
