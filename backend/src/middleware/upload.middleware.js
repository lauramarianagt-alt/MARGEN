import { fileTypeFromBuffer } from 'file-type'
import multer from 'multer'

const MAX_COVER_SIZE_BYTES = 6 * 1024 * 1024

const ALLOWED_COVER_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_COVER_SIZE_BYTES,
    files: 1,
    fields: 10,
    fieldSize: 400_000,
    parts: 11,
  },
}).single('cover')

export function uploadArticleCover(req, res, next) {
  multerUpload(req, res, async (uploadError) => {
    if (uploadError instanceof multer.MulterError) {
      if (uploadError.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'Cover image must be 6 MB or smaller.',
        })
      }

      if (uploadError.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Only one cover image can be uploaded.',
        })
      }

      return res.status(400).json({
        error: 'Invalid cover image upload.',
      })
    }

    if (uploadError) {
      console.error('Unable to receive cover image:', uploadError)

      return res.status(400).json({
        error: 'Unable to receive cover image.',
      })
    }

    if (!req.file) {
      return next()
    }

    try {
      const detectedType = await fileTypeFromBuffer(req.file.buffer)

      const detectedExtension = detectedType
        ? ALLOWED_COVER_TYPES.get(detectedType.mime)
        : null

      if (!detectedExtension) {
        return res.status(400).json({
          error: 'Cover image must be a JPEG, PNG, or WebP file.',
        })
      }

      req.file.detectedMimeType = detectedType.mime
      req.file.detectedExtension = detectedExtension

      return next()
    } catch (typeError) {
      console.error('Unable to inspect cover image:', typeError)

      return res.status(400).json({
        error: 'Unable to validate cover image.',
      })
    }
  })
}
