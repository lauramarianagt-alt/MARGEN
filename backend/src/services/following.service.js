import { findPublicAuthorByUsername } from '../repositories/authors.repository.js'
import {
  findFollowing,
  saveFollowing,
  deleteFollowing,
  findPersonalizedArticles,
} from '../repositories/following.repository.js'
export class FollowingError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
async function authorFor(username) {
  const author = await findPublicAuthorByUsername(username)
  if (!author) throw new FollowingError(404, 'Author not found')
  return author
}
export async function getFollowing({ accessToken, userId, username }) {
  const author = await authorFor(username)
  return {
    following: Boolean(await findFollowing(accessToken, userId, author.id)),
  }
}
export async function setFollowing({
  accessToken,
  userId,
  username,
  following,
}) {
  const author = await authorFor(username)
  if (author.id === userId)
    throw new FollowingError(400, 'You cannot follow yourself')
  if (following) await saveFollowing(accessToken, userId, author.id)
  else await deleteFollowing(accessToken, userId, author.id)
  return { following }
}
export async function getPersonalizedFeed({
  accessToken,
  page,
  limit,
  search,
  category,
}) {
  const result = await findPersonalizedArticles(accessToken, {
    page,
    limit,
    search,
    category,
  })
  const total = Number(result.total)
  return {
    articles: result.articles ?? [],
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}
