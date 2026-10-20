import { z } from 'zod'

export const createCommentSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, 'Comment content is required')
      .max(2000, 'Comment content must be 2000 characters or fewer'),
  })
  .strict()

export const commentIdParamSchema = z.object({
  commentId: z.string().uuid(),
})
