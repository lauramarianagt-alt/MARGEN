grant usage on schema public to anon, authenticated, service_role;

grant select
on table public.articles
to anon, authenticated;

grant insert, update, delete
on table public.articles
to authenticated;

grant select
on table public.article_categories
to anon, authenticated;

grant insert, delete
on table public.article_categories
to authenticated;

grant select, insert, update, delete
on table public.articles
to service_role;

grant select, insert, update, delete
on table public.article_categories
to service_role;