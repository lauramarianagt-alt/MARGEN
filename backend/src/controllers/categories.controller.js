import { getCategories } from '../services/categories.service.js'

export async function listCategories(req, res) {
  try {
    const categories = await getCategories()

    return res.status(200).json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)

    return res.status(500).json({
      error: 'Unable to fetch categories',
    })
  }
}