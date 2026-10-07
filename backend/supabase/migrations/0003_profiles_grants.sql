-- ============================================================
-- MARGEN
-- Profile API permissions
-- ============================================================

grant usage on schema public
to anon, authenticated, service_role;

-- Public profiles can be read by anyone.
grant select
on table public.profiles
to anon, authenticated;

-- Authenticated users can create and update their own profile.
-- RLS decides which row they are allowed to touch.
grant insert, update
on table public.profiles
to authenticated;

-- Backend-only operations using the Supabase secret key.
grant select, insert, update, delete
on table public.profiles
to service_role;