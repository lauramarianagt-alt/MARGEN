import {
  CategoryServiceError,
  getCategories,
  getPublicCategory as getPublicCategoryService,
} from '../services/categories.service.js'
import { publicCategoryParamsSchema } from '../validators/categories.schemas.js'

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

export async function getPublicCategory(req, res) {
  const validation = publicCategoryParamsSchema.safeParse(req.params)

  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request data',
      details: validation.error.flatten(),
    })
  }

  try {
    const category = await getPublicCategoryService(validation.data.slug)

    return res.status(200).json({
      category,
    })
  } catch (error) {
    if (error instanceof CategoryServiceError) {
      return res.status(error.status).json({
        error: error.message,
      })
    }

    console.error('Error fetching category:', error)

    return res.status(500).json({
      error: 'Unable to fetch category',
    })
  }
}
