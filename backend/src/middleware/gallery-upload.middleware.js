import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1, fields: 3, fieldSize: 2048 },
}).single('image')
export function uploadGalleryFile(req, res, next) {
  upload(req, res, async (error) => {
    if (error)
      return res
        .status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
        .json({ error: 'Upload one JPEG, PNG or WebP image, up to 6 MB.' })
    if (!req.file) return res.status(400).json({ error: 'Image required' })
    try {
      const type = await fileTypeFromBuffer(req.file.buffer)
      if (
        !type ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(type.mime)
      )
        return res.status(400).json({ error: 'Unsupported image format' })
      next()
    } catch {
      res.status(400).json({ error: 'Unable to validate image' })
    }
  })
}
