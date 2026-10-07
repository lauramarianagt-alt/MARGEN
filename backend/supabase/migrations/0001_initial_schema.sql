-- ============================================================
-- MARGEN
-- Initial database schema
-- ============================================================


-- ============================================================
-- TYPES
-- ============================================================

create type public.article_status as enum (
  'draft',
  'published'
);


-- ============================================================
-- PROFILES
-- Extends Supabase auth.users.
-- The profile id is exactly the auth user id.
-- ============================================================

create table public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  username text not null unique,
  name text not null,
  surname text not null,
  bio text,
  avatar_url text,

  preferred_locale text not null default 'es',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_not_empty
    check (char_length(trim(username)) >= 3),

  constraint profiles_name_not_empty
    check (char_length(trim(name)) > 0),

  constraint profiles_surname_not_empty
    check (char_length(trim(surname)) > 0),

  constraint profiles_locale_format
    check (
      preferred_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
    )
);


-- ============================================================
-- CATEGORIES
-- ============================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  slug text not null unique,
  description text,

  created_at timestamptz not null default now(),

  constraint categories_name_not_empty
    check (char_length(trim(name)) > 0),

  constraint categories_slug_not_empty
    check (char_length(trim(slug)) > 0)
);


-- ============================================================
-- ARTICLES
-- ============================================================

create table public.articles (
  id uuid primary key default gen_random_uuid(),

  author_id uuid not null
    references public.profiles(id)
    on delete cascade,

  title text not null,
  slug text not null,

  excerpt text,
  content text not null default '',

  cover_image_url text,

  language text not null default 'es',

  status public.article_status not null default 'draft',

  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint articles_title_not_empty
    check (char_length(trim(title)) > 0),

  constraint articles_slug_not_empty
    check (char_length(trim(slug)) > 0),

  constraint articles_language_format
    check (
      language ~ '^[a-z]{2}(-[A-Z]{2})?$'
    ),

  constraint articles_published_requires_date
    check (
      status = 'draft'
      or published_at is not null
    ),

  constraint articles_author_slug_unique
    unique (author_id, slug)
);


-- ============================================================
-- ARTICLE <-> CATEGORY
-- Many-to-many relationship
-- ============================================================

create table public.article_categories (
  article_id uuid not null
    references public.articles(id)
    on delete cascade,

  category_id uuid not null
    references public.categories(id)
    on delete cascade,

  primary key (article_id, category_id)
);


-- ============================================================
-- INDEXES
-- ============================================================

create index articles_author_id_idx
  on public.articles(author_id);

create index articles_status_idx
  on public.articles(status);

create index articles_published_at_idx
  on public.articles(published_at desc);

create index articles_public_feed_idx
  on public.articles(published_at desc)
  where status = 'published';

create index article_categories_category_id_idx
  on public.article_categories(category_id);


-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


create trigger articles_set_updated_at
before update on public.articles
for each row
execute function public.set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_categories enable row level security;


-- ============================================================
-- PROFILES POLICIES
-- Public profiles can be read by anyone.
-- Users may create/update only their own profile.
-- ============================================================

create policy "Profiles are publicly readable"
on public.profiles
for select
using (true);


create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
);


create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


-- ============================================================
-- CATEGORY POLICIES
-- Categories are public.
-- Creation/modification remains server-side.
-- ============================================================

create policy "Categories are publicly readable"
on public.categories
for select
using (true);


-- ============================================================
-- ARTICLE POLICIES
--
-- Public:
--   only published articles whose publication time has arrived.
--
-- Authors:
--   can also see their own drafts/scheduled articles.
-- ============================================================

create policy "Published articles are public and authors can read their own"
on public.articles
for select
using (
  (
    status = 'published'
    and published_at <= now()
  )
  or auth.uid() = author_id
);


create policy "Authors can create articles"
on public.articles
for insert
to authenticated
with check (
  auth.uid() = author_id
);


create policy "Authors can update their own articles"
on public.articles
for update
to authenticated
using (
  auth.uid() = author_id
)
with check (
  auth.uid() = author_id
);


create policy "Authors can delete their own articles"
on public.articles
for delete
to authenticated
using (
  auth.uid() = author_id
);


-- ============================================================
-- ARTICLE CATEGORY POLICIES
-- ============================================================

create policy "Public article categories are readable"
on public.article_categories
for select
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_categories.article_id
      and (
        (
          articles.status = 'published'
          and articles.published_at <= now()
        )
        or articles.author_id = auth.uid()
      )
  )
);


create policy "Authors can categorize their own articles"
on public.article_categories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.articles
    where articles.id = article_categories.article_id
      and articles.author_id = auth.uid()
  )
);


create policy "Authors can remove categories from their own articles"
on public.article_categories
for delete
to authenticated
using (
  exists (
    select 1
    from public.articles
    where articles.id = article_categories.article_id
      and articles.author_id = auth.uid()
  )
);


-- ============================================================
-- INITIAL MARGEN CATEGORIES
-- ============================================================

insert into public.categories (
  name,
  slug,
  description
)
values
  (
    'Emerging Designers',
    'emerging-designers',
    'New voices and independent designers shaping contemporary fashion.'
  ),
  (
    'Streetwear',
    'streetwear',
    'Street culture, clothing and the communities influencing contemporary style.'
  ),
  (
    'Runway',
    'runway',
    'Collections, shows and perspectives from the runway.'
  ),
  (
    'Visual Culture',
    'visual-culture',
    'Fashion through image, art, media and contemporary visual culture.'
  ),
  (
    'Photography',
    'photography',
    'Fashion photography, image-making and visual storytelling.'
  ),
  (
    'Sustainability',
    'sustainability',
    'Design, production and alternative approaches to a more responsible fashion industry.'
  ),
  (
    'Interviews',
    'interviews',
    'Conversations with designers, photographers, stylists and emerging creative voices.'
  ),
  (
    'Design',
    'design',
    'Ideas, processes and objects at the intersection of fashion and design.'
  )
on conflict (slug) do nothing;