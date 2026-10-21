import { z } from 'zod'
import { AccountError, closeAccount } from '../services/account.service.js'
import { clearAuthCookies } from '../utils/auth-cookies.js'
const schema = z
  .object({
    password: z.string().min(1).max(256),
    confirmation: z.string().trim().min(3).max(30),
    acknowledged: z.literal(true),
  })
  .strict()
export async function removeAccount(req, res) {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: 'Account confirmation required' })
  try {
    await closeAccount({
      accessToken: req.accessToken,
      user: req.user,
      ...parsed.data,
    })
    clearAuthCookies(res)
    return res.status(204).send()
  } catch (error) {
    if (error instanceof AccountError)
      return res.status(error.status).json({ error: error.message })
    console.error('Unable to close account:', error)
    return res
      .status(500)
      .json({ error: 'Unable to close account. Please try again.' })
  }
}
