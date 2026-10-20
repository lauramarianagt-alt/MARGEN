import {
  findAllCategories,
  findCategoryBySlug,
} from '../repositories/categories.repository.js'

export class CategoryServiceError extends Error {
  constructor(status, message) {
    super(message)

    this.name = 'CategoryServiceError'
    this.status = status
  }
}

export async function getCategories() {
  return findAllCategories()
}

export async function getPublicCategory(slug) {
  const category = await findCategoryBySlug(slug)

  if (!category) {
    throw new CategoryServiceError(404, 'Category not found')
  }

  return category
}
