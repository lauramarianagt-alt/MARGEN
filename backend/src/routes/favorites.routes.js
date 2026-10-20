import { Router } from 'express'

import {
  addFavorite,
  deleteFavorite,
  getFavorite,
  listFavorites,
} from '../controllers/favorites.controller.js'

import { requireAuth } from '../middleware/require-auth.js'

const favoritesRouter = Router()

favoritesRouter.get('/', requireAuth, listFavorites)

favoritesRouter.get('/:id', requireAuth, getFavorite)

favoritesRouter.post('/:id', requireAuth, addFavorite)

favoritesRouter.delete('/:id', requireAuth, deleteFavorite)

export default favoritesRouter
