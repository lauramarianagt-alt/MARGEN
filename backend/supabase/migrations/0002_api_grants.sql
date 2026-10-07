-- ============================================================
-- MARGEN
-- Data API permissions
-- ============================================================

grant usage on schema public to anon, authenticated;

grant select
on table public.categories
to anon, authenticated;s