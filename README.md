# MARGEN

**Independent fashion & visual culture.**

Plataforma editorial de moda independiente, diseño y cultura visual. Adapta el
concepto de blogging de WellDone: la audiencia también puede convertirse en autora.

Web publicada: [margen-editorial.duckdns.org](https://margen-editorial.duckdns.org/).

## Funcionalidades implementadas

- Web pública: últimos artículos, búsqueda, categorías y perfiles de autor con paginación.
- Artículos con URL `/:username/:slug`, portadas, introducción, contenido e idioma.
- Registro, confirmación por correo, login, logout y renovación de sesión.
- Área privada: crear, editar y borrar artículos propios; borradores y publicación futura.
- Comentarios paginados, favoritos privados y me gusta; permisos comprobados en servicios.
- Interfaz ES/EN, estados de carga, error, contenido vacío y reintentos.
- Validación de datos y de archivos JPEG, PNG y WebP (hasta 6 MB).
- Sesión gestionada por el backend con cookies HttpOnly; los tokens no van a localStorage.
- Esquema SQL versionado con Row Level Security.

La publicación programada se resuelve filtrando por `status = published` y
`published_at <= now()`; no requiere un cron para mostrar el artículo.
Editar un título conserva su slug para mantener los enlaces compartidos.

## Desarrollo local

Requisitos: Node.js 24.22 o posterior, npm y un proyecto Supabase con Auth,
PostgreSQL y Storage. Frontend y backend tienen sus propios lockfiles.

### 1. Base de datos

En un proyecto de desarrollo nuevo, aplica en orden los archivos de
`backend/supabase/migrations/0001_initial_schema.sql` a `0007_public_like_visibility.sql`.
La migración 0005 añade comentarios, favoritos, me gusta y el bucket público
`article-covers`. Las subidas y eliminaciones de portadas se realizan en el servidor.

Si tu base ya contiene tablas sociales creadas manualmente, compara primero sus
columnas, claves foráneas y políticas con la migración 0005 en un entorno de pruebas.
`IF NOT EXISTS` conserva las tablas existentes; no transforma esquemas diferentes
ni elimina políticas antiguas. No reapliques las migraciones iniciales a una base existente.

La migración 0006 restringe los nuevos nombres de usuario a letras ASCII, números,
guion y guion bajo (3–30 caracteres), y excluye rutas reservadas. Usa `NOT VALID`
para conservar perfiles antiguos. Antes de validar la restricción sobre todos los
perfiles, revísalos y acuerda cualquier cambio de sus URLs. La API aplica la misma
validación al registrar usuarios.

La migración 0007 restringe la lectura de me gusta a artículos ya publicados.
Permite actualizar esa política en una base existente sin recrear tablas ni tocar
las demás políticas sociales.

### 2. Backend

```bash
cd backend
npm ci
cp .env.example .env
```

Rellena `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY` en `.env`.
La clave secreta se utiliza solo en el backend. `FRONTEND_URL` debe coincidir con el
origen de la web; en producción configura `NODE_ENV=production` y HTTPS.

Después de configurar las variables, arranca el backend con `npm run dev`.

Backend: http://localhost:3000
Health check: http://localhost:3000/api/health

### 3. Frontend (otra terminal)

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Frontend: http://localhost:5173
`VITE_API_URL` apunta a la API y debe incluir `/api`. En el despliegue actual puede
configurarse como `/api` si frontend y backend comparten dominio mediante proxy.

### 4. Confirmación de correo

Configura la Site URL y las Redirect URLs permitidas de Supabase Auth con los
orígenes de desarrollo y producción. El registro usa `FRONTEND_URL` como destino.
El flujo estándar vuelve a la web, limpia los tokens del fragmento de la URL y lleva
al login mostrando la confirmación. También existe `GET /api/auth/confirm` para
plantillas de email que envíen `token_hash` y `type` al backend.

## Comprobaciones

Desde `backend`:

```bash
npm test
npm run lint
npm run format:check
```

Desde `frontend`:

```bash
npm test
npm run build
npm run lint
npm run format:check
```

Las pruebas de backend incluyen rutas HTTP con Supertest, servicios y migraciones.
Las migraciones se ejecutan en PostgreSQL local mediante PGlite: usan dos usuarios
ficticios y comprueban aislamiento, borradores, publicaciones futuras, comentarios,
favoritos y me gusta. No conectan con la base de producción. Las tablas internas de
Auth y Storage se simulan; el envío de correo y la API de archivos de Supabase
requieren comprobaciones aparte.

Las pruebas de frontend usan React Testing Library, jsdom y servicios simulados:
comprueban paginación de comentarios, altas/bajas, cambio de rutas, búsqueda,
idioma, registro y renovación concurrente de sesión. No equivalen a pruebas de
navegador contra Supabase real. Supertest necesita poder abrir un puerto local.

## Despliegue actual

Ubuntu en AWS, Nginx con HTTPS y PM2 (`margen-api`). Nginx sirve `/var/www/margen`
y envía `/api/` al backend en el puerto 3000. Repositorio: `/home/ubuntu/MARGEN`.

Después de subir los cambios a GitHub, desde el servidor:

```bash
cd /home/ubuntu/MARGEN
git pull --ff-only
cd backend
npm ci --omit=dev
cd ../frontend
npm ci
npm run build
sudo rsync -a dist/assets/ /var/www/margen/assets/
sudo install -m 644 dist/index.html /var/www/margen/index.html
pm2 restart margen-api
curl --fail https://margen-editorial.duckdns.org/api/health
```

Antes de actualizar, comprueba que el repositorio del servidor no tiene cambios
locales y guarda una copia del frontend publicado. Copiar primero los assets y
conservar los anteriores permite atender pestañas abiertas durante el despliegue.
Los `.env` del servidor se mantienen fuera de Git. Las migraciones se aplican por
separado; un `git pull` no cambia la base de datos.

## Arquitectura

- React 19 + Vite y React Router.
- Node.js + Express: rutas, controladores, servicios y repositorios separados.
- PostgreSQL, Supabase Auth y Supabase Storage.
- i18next + react-i18next; Zod; Vitest, Supertest y React Testing Library.

## Próximas mejoras

- Recuperación de contraseña y edición/baja de cuenta desde la interfaz.
- Editor de texto enriquecido y variantes de imagen para distintos dispositivos.
- SEO con metadatos renderizados en el servidor o prerenderizados, Open Graph y sitemap.
- Seguimiento de autores, notificaciones, menciones y subrayados.
- Pruebas automatizadas de navegador, integración con Supabase de pruebas y CI/CD.
- Contenido editorial de demostración y créditos de fotografía.

Las etiquetas y metadatos básicos en el navegador no equivalen a SEO completo:
el contenido público sigue siendo una SPA renderizada en el cliente.

La página 404 de React tampoco cambia el estado HTTP 200 del fallback de Nginx.
