begin;

create table if not exists public.author_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, author_id),
  constraint author_follows_no_self check (follower_id <> author_id)
);
alter table public.author_follows enable row level security;
revoke all on public.author_follows from anon, authenticated;
grant select, insert, delete on public.author_follows to authenticated;
grant all on public.author_follows to service_role;
drop policy if exists "Members manage their own follows" on public.author_follows;
create policy "Members manage their own follows" on public.author_follows
for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- Invoker security keeps follow lists private and applies article RLS as usual.
-- Publication checks also exclude the caller's own drafts and scheduled stories.
create or replace function public.personalized_articles(
  p_limit integer default 10,
  p_offset integer default 0,
  p_search text default null,
  p_category text default null
) returns jsonb
language sql stable security invoker set search_path = public, pg_temp as $$
with matching as (
  select a.id, a.author_id, a.title, a.slug, a.excerpt, a.cover_image_url,
    a.cover_image_variants, a.language, a.status, a.published_at, a.created_at, a.updated_at,
    exists(select 1 from public.author_follows f where f.follower_id = auth.uid() and f.author_id = a.author_id) as is_followed
  from public.articles a
  where a.status = 'published' and a.published_at <= now()
    and (p_search is null or a.title ilike '%' || p_search || '%' or a.excerpt ilike '%' || p_search || '%')
    and (p_category is null or exists(
      select 1 from public.article_categories ac join public.categories c on c.id = ac.category_id
      where ac.article_id = a.id and c.slug = p_category
    ))
), selected as (
  select * from matching order by is_followed desc, published_at desc, id desc
  limit greatest(1, least(coalesce(p_limit, 10), 50)) offset greatest(coalesce(p_offset, 0), 0)
), decorated as (
  select s.is_followed, s.published_at, s.id,
    (to_jsonb(s) - 'content') || jsonb_build_object(
      'author', (select jsonb_build_object('id',p.id,'username',p.username,'name',p.name,'surname',p.surname,'avatar_url',p.avatar_url) from public.profiles p where p.id = s.author_id),
      'article_categories', coalesce((select jsonb_agg(jsonb_build_object('category',jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug)) order by c.slug)
        from public.article_categories ac join public.categories c on c.id = ac.category_id where ac.article_id = s.id),'[]'::jsonb)
    ) as article
  from selected s
)
select jsonb_build_object(
  'articles', coalesce((select jsonb_agg(article order by is_followed desc, published_at desc, id desc) from decorated),'[]'::jsonb),
  'total', (select count(*) from matching)
);
$$;
revoke all on function public.personalized_articles(integer,integer,text,text) from public, anon;
grant execute on function public.personalized_articles(integer,integer,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
