import { z } from 'zod'

const languageSchema = z
  .string()
  .regex(
    /^[a-z]{2}(-[A-Z]{2})?$/,
    'Language must use a valid locale format',
  )

const articleStatusSchema = z.enum([
  'draft',
  'published',
])

const publishedAtSchema = z
  .string()
  .datetime({ offset: true })

const categoryIdsSchema = z
  .array(z.string().uuid())
  .max(10)

export const createArticleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200),

    excerpt: z
      .string()
      .trim()
      .max(600)
      .nullable()
      .optional(),

    content: z
      .string()
      .max(100_000)
      .default(''),

    language: languageSchema.default('es'),

    status: articleStatusSchema.default('draft'),

    publishedAt: publishedAtSchema
      .nullable()
      .optional(),

    categoryIds: categoryIdsSchema.default([]),
  })
  .strict()

export const updateArticleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200)
      .optional(),

    excerpt: z
      .string()
      .trim()
      .max(600)
      .nullable()
      .optional(),

    content: z
      .string()
      .max(100_000)
      .optional(),

    language: languageSchema.optional(),

    status: articleStatusSchema.optional(),

    publishedAt: publishedAtSchema
      .nullable()
      .optional(),

    categoryIds: categoryIdsSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message:
        'At least one field must be provided',
    },
  )

export const articleIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),
})