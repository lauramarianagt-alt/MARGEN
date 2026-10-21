import { z } from 'zod'

const reservedUsernames = new Set([
  'api',
  'articles',
  'assets',
  'categories',
  'dashboard',
  'login',
  'register',
])

const localeSchema = z
  .string()
  .regex(
    /^[a-z]{2}(-[A-Z]{2})?$/,
    'Locale must use a valid format such as es, en or es-ES',
  )

export const registerSchema = z.object({
  email: z.email('Email must be valid'),

  password: z.string().min(8, 'Password must contain at least 8 characters'),

  username: z
    .string()
    .trim()
    .min(3, 'Username must contain at least 3 characters')
    .max(30, 'Username must contain at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username contains unsupported characters')
    .refine((value) => !reservedUsernames.has(value.toLowerCase()), {
      message: 'This username is reserved',
    }),

  name: z.string().trim().min(1, 'Name is required'),

  surname: z.string().trim().min(1, 'Surname is required'),

  preferredLocale: localeSchema.default('es'),
})

export const loginSchema = z.object({
  email: z.email('Email must be valid'),

  password: z.string().min(1, 'Password is required'),
})
