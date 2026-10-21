begin;

-- Public, aggregate-only ranking. RLS still applies; no voter identities returned.
-- A day follows Europe/Madrid, including daylight-saving changes.
create index if not exists article_likes_created_article_idx
  on public.article_likes (created_at, article_id);

create or replace function public.featured_articles(p_limit integer default 4)
returns jsonb language sql stable security invoker
set search_path = public, pg_temp as $$
with day_bounds as (
  select (now() at time zone 'Europe/Madrid')::date as day,
    date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid' as starts_at,
    (date_trunc('day', now() at time zone 'Europe/Madrid') + interval '1 day') at time zone 'Europe/Madrid' as ends_at
), daily_likes as (
  select l.article_id, count(*) as likes_today
  from public.article_likes l cross join day_bounds d
  where l.created_at >= d.starts_at and l.created_at < d.ends_at and l.created_at <= now()
  group by l.article_id
), ranked as (
  select a.id, a.author_id, a.title, a.slug, a.excerpt, a.cover_image_url,
    a.cover_image_variants, a.language, a.published_at,
    coalesce(l.likes_today, 0) as likes_today
  from public.articles a left join daily_likes l on l.article_id = a.id
  where a.status = 'published' and a.published_at <= now()
    and nullif(btrim(a.cover_image_url), '') is not null
), selected as (
  select * from ranked order by likes_today desc, published_at desc, id desc
  limit greatest(1, least(coalesce(p_limit, 4), 6))
), decorated as (
  select s.likes_today, s.published_at, s.id,
    to_jsonb(s) || jsonb_build_object(
      'author', (select jsonb_build_object('id', p.id, 'username', p.username, 'name', p.name, 'surname', p.surname) from public.profiles p where p.id = s.author_id),
      'article_categories', coalesce((select jsonb_agg(jsonb_build_object('category', jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)) order by c.slug)
        from public.article_categories ac join public.categories c on c.id = ac.category_id where ac.article_id = s.id), '[]'::jsonb)
    ) as article from selected s
)
select jsonb_build_object(
  'articles', coalesce((select jsonb_agg(article order by likes_today desc, published_at desc, id desc) from decorated), '[]'::jsonb),
  'mode', case when exists(select 1 from ranked where likes_today > 0) then 'daily-likes' else 'latest' end,
  'date', (select day from day_bounds),
  'timezone', 'Europe/Madrid'
);
$$;
revoke all on function public.featured_articles(integer) from public;
grant execute on function public.featured_articles(integer) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
