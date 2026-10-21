import { publicAuthorParamsSchema } from '../validators/authors.schemas.js'
import { publicArticlesQuerySchema } from '../validators/articles.schemas.js'
import {
  FollowingError,
  getFollowing,
  setFollowing,
  getPersonalizedFeed,
} from '../services/following.service.js'
const identity = (req) => ({
  accessToken: req.accessToken,
  userId: req.user.id,
})
function endpoint(schema, source, action) {
  return async (req, res) => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success)
      return res.status(400).json({ error: 'Invalid following request' })
    try {
      return res.json(await action(req, parsed.data))
    } catch (error) {
      if (error instanceof FollowingError)
        return res.status(error.status).json({ error: error.message })
      console.error('Following request failed:', error)
      return res
        .status(500)
        .json({ error: 'Unable to load or update following' })
    }
  }
}
export const followingState = endpoint(
  publicAuthorParamsSchema,
  'params',
  (req, data) => getFollowing({ ...identity(req), ...data }),
)
export const followAuthor = endpoint(
  publicAuthorParamsSchema,
  'params',
  (req, data) => setFollowing({ ...identity(req), ...data, following: true }),
)
export const unfollowAuthor = endpoint(
  publicAuthorParamsSchema,
  'params',
  (req, data) => setFollowing({ ...identity(req), ...data, following: false }),
)
export const personalizedFeed = endpoint(
  publicArticlesQuerySchema.omit({ author: true }).strict(),
  'query',
  (req, data) => getPersonalizedFeed({ ...identity(req), ...data }),
)
