import { findAllCategories } from '../repositories/categories.repository.js'

export async function getCategories() {
  return findAllCategories()
}