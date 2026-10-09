# MARGEN

**Independent fashion & visual culture.**


MARGEN es una plataforma editorial de moda independiente orientada a una audiencia joven interesada en moda, diseño y cultura visual.

El proyecto nace como una verticalización de **WellDone**, para la práctica final. La propuesta original plantea una plataforma de blogging similar a Medium; MARGEN adapta ese concepto al mundo de la moda manteniendo la arquitectura y los principales requisitos funcionales del proyecto.

---

## Concepto

MARGEN no es únicamente una revista digital.

Es una plataforma editorial en la que la audiencia también puede convertirse en autora.

La plataforma estará orientada a contenidos como:

- diseñadores emergentes
- fotografía de moda
- cultura visual
- streetwear
- sostenibilidad
- entrevistas
- diseño
- procesos creativos
- opinión y ensayo

### Valores

- independencia
- criterio
- creatividad
- descubrimiento
- diversidad de perspectivas
- cuidado visual

---

## Desarrollo local

Estas URLs corresponden al entorno local de desarrollo. Para utilizarlas es necesario ejecutar frontend y backend en local.

Frontend: http://localhost:5173

Backend: http://localhost:3000

Health check de la API: http://localhost:3000/api/health

## Estado actual

El proyecto se encuentra actualmente en desarrollo.

### Implementado

- [x] Frontend con React + Vite
- [x] React Router
- [x] Backend con Node.js + Express
- [x] API REST propia
- [x] PostgreSQL mediante Supabase
- [x] Supabase Auth
- [x] Migraciones SQL versionadas
- [x] Row Level Security
- [x] Roles y permisos básicos
- [x] Registro de usuarios
- [x] Confirmación de email
- [x] Login
- [x] Logout
- [x] Refresh de sesión
- [x] Cookies HttpOnly
- [x] Perfil asociado a cada usuario
- [x] Rutas privadas en React
- [x] Dashboard privado
- [x] Categorías editoriales
- [x] Endpoint `GET /api/categories`
- [x] Internacionalización ES / EN
- [x] Validación con Zod
- [x] Testing backend con Vitest + Supertest
- [x] Estados básicos de loading y error
- [x] Flujo Git con commits por funcionalidad

### En desarrollo

- [ ] CRUD de artículos
- [ ] Mis artículos
- [ ] Borradores y publicaciones
- [ ] Publicación programada
- [ ] Imagen destacada
- [ ] Supabase Storage
- [ ] Web pública de artículos
- [ ] Artículos por categoría
- [ ] Perfil público de autor
- [ ] Paginación
- [ ] Búsqueda
- [ ] Recuperación de contraseña
- [ ] Edición de perfil

### Backlog posterior

- [ ] Comentarios
- [ ] Favoritos
- [ ] Seguir autores
- [ ] Notificaciones
- [ ] Menciones
- [ ] Galerías editoriales
- [ ] Créditos de fotografía / estilismo
- [ ] SEO
- [ ] Deploy en AWS
- [ ] CI/CD
- [ ] Pulido visual final

---

## Arquitectura

- MARGEN utiliza una arquitectura frontend/backend separada.
- La autenticación utiliza Supabase Auth, pero la sesión de la aplicación es gestionada a través del backend.
- Los tokens no se almacenan en localStorage.
- Multiidioma ES/EN con i18next y react-i18next.
- Testing con Vitest y Supertest.
- FRONTEND: react, Vite, React Router, i18next, react-i18next.
- BACKEND: Node.js, Express, Zod, cookie-parser, CORS.

