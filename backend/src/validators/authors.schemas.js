import { z } from 'zod'

export const publicAuthorParamsSchema = z.object({
  username: z.string().trim().min(3).max(30),
})
