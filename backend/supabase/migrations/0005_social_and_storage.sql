-- Social features used by the API. Keep authorization in RLS as well as services.
-- IF NOT EXISTS supports installations where these tables were created manually.
-- Review existing table definitions before applying this migration to production.

begin;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table if not exists public.article_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists comments_article_created_idx
  on public.comments (article_id, created_at desc);
create index if not exists favorites_user_created_idx
  on public.favorites (user_id, created_at desc);
create index if not exists article_likes_article_idx
  on public.article_likes (article_id);

alter table public.comments enable row level security;
alter table public.favorites enable row level security;
alter table public.article_likes enable row level security;

-- Revoke default table privileges so only the operations below are exposed.
revoke all on public.comments, public.favorites, public.article_likes
  from anon, authenticated;
grant select on public.comments, public.article_likes to anon, authenticated;
grant insert, delete on public.comments, public.article_likes to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant all on public.comments, public.favorites, public.article_likes to service_role;

drop policy if exists "Anyone can read comments on published articles" on public.comments;
create policy "Anyone can read comments on published articles" on public.comments
for select to anon, authenticated
using (exists (
  select 1 from public.articles a
  where a.id = article_id and a.status = 'published' and a.published_at <= now()
));

drop policy if exists "Users can comment on other authors articles" on public.comments;
create policy "Users can comment on other authors articles" on public.comments
for insert to authenticated
with check (auth.uid() = author_id and exists (
  select 1 from public.articles a
  where a.id = article_id and a.author_id <> auth.uid()
    and a.status = 'published' and a.published_at <= now()
));

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments" on public.comments
for delete to authenticated using (auth.uid() = author_id);

drop policy if exists "Users can read own favorites" on public.favorites;
create policy "Users can read own favorites" on public.favorites
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can create own favorites" on public.favorites;
create policy "Users can create own favorites" on public.favorites
for insert to authenticated
with check (auth.uid() = user_id and exists (
  select 1 from public.articles a
  where a.id = article_id and (
    a.author_id = auth.uid()
    or (a.status = 'published' and a.published_at <= now())
  )
));

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites" on public.favorites
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can read article likes" on public.article_likes;
create policy "Anyone can read article likes" on public.article_likes
for select to anon, authenticated
using (exists (
  select 1 from public.articles a
  where a.id = article_id and a.status = 'published' and a.published_at <= now()
));

drop policy if exists "Users can like other authors articles" on public.article_likes;
create policy "Users can like other authors articles" on public.article_likes
for insert to authenticated
with check (auth.uid() = user_id and exists (
  select 1 from public.articles a
  where a.id = article_id and a.author_id <> auth.uid()
    and a.status = 'published' and a.published_at <= now()
));

drop policy if exists "Users can remove own likes" on public.article_likes;
create policy "Users can remove own likes" on public.article_likes
for delete to authenticated using (auth.uid() = user_id);

-- The server uploads and removes images with service_role. Public clients get
-- the public URL but have no upload, overwrite or delete policy on storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-covers', 'article-covers', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

commit;
