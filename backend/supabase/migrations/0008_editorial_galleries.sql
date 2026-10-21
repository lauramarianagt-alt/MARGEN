begin;

alter table public.articles add column if not exists cover_image_variants jsonb not null default '[]'::jsonb;

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  image_url text not null,
  thumbnail_url text not null,
  storage_path text not null,
  thumbnail_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  thumbnail_width integer not null check (thumbnail_width > 0),
  alt_text text not null check (char_length(trim(alt_text)) between 1 and 300),
  caption text not null default '' check (char_length(caption) <= 300),
  created_at timestamptz not null default now(),
  constraint gallery_owned_paths check (
    storage_path like owner_id::text || '/%'
    and thumbnail_path like owner_id::text || '/%'
  )
);
create index if not exists gallery_images_context_idx on public.gallery_images (owner_id, article_id, created_at, id);
alter table public.gallery_images enable row level security;
revoke all on public.gallery_images from anon, authenticated;
grant select on public.gallery_images to anon, authenticated;
grant insert, delete on public.gallery_images to authenticated;
grant update (alt_text, caption) on public.gallery_images to authenticated;
grant all on public.gallery_images to service_role;

drop policy if exists "Readers see public galleries and owners see their work" on public.gallery_images;
create policy "Readers see public galleries and owners see their work" on public.gallery_images
for select to anon, authenticated using (
  owner_id = auth.uid() or exists (
    select 1 from public.articles a where a.id = article_id
      and a.status = 'published' and a.published_at <= now()
  )
);
drop policy if exists "Authors add their own gallery images" on public.gallery_images;
create policy "Authors add their own gallery images" on public.gallery_images
for insert to authenticated with check (
  owner_id = auth.uid() and (exists (
    select 1 from public.articles a where a.id = article_id and a.author_id = auth.uid()
  ))
);
drop policy if exists "Authors edit their own gallery images" on public.gallery_images;
create policy "Authors edit their own gallery images" on public.gallery_images
for update to authenticated using (owner_id = auth.uid()) with check (
  owner_id = auth.uid() and (exists (
    select 1 from public.articles a where a.id = article_id and a.author_id = auth.uid()
  ))
);
drop policy if exists "Authors remove their own gallery images" on public.gallery_images;
create policy "Authors remove their own gallery images" on public.gallery_images
for delete to authenticated using (owner_id = auth.uid());

-- Serialize inserts for a given gallery so simultaneous uploads respect its limit.
create or replace function public.enforce_gallery_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text || new.article_id::text, 0));
  if (select count(*) from public.gallery_images g where g.owner_id = new.owner_id
      and g.article_id is not distinct from new.article_id) >= 12 then
    raise exception 'Gallery limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists gallery_limit on public.gallery_images;
create trigger gallery_limit before insert on public.gallery_images for each row execute function public.enforce_gallery_limit();

-- Profile editing keeps the URL and account credentials outside this endpoint.
grant update (name, surname, bio) on public.profiles to authenticated;
drop policy if exists "Members edit their own public biography" on public.profiles;
create policy "Members edit their own public biography" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

commit;
