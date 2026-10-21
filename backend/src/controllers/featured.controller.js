import { z } from 'zod'
import { findFeaturedArticles } from '../repositories/featured.repository.js'

const querySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(6).default(4) })
  .strict()

export async function listFeaturedArticles(req, res) {
  const query = querySchema.safeParse(req.query)
  if (!query.success)
    return res.status(400).json({ error: 'Invalid featured articles request' })
  try {
    return res.json(await findFeaturedArticles(query.data.limit))
  } catch (error) {
    console.error('Unable to load featured articles:', error)
    return res.status(500).json({ error: 'Unable to load featured articles' })
  }
}
