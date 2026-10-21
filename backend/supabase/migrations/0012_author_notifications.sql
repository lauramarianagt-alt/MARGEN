begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  article_id uuid not null references public.articles(id) on delete cascade,
  kind text not null check (kind in ('like', 'save', 'comment')),
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_no_self check (recipient_id <> actor_id),
  constraint notifications_comment_kind check ((kind = 'comment') = (comment_id is not null))
);
create unique index if not exists notifications_reaction_idx
  on public.notifications (actor_id, article_id, kind) where kind in ('like', 'save');
create unique index if not exists notifications_comment_idx
  on public.notifications (comment_id) where kind = 'comment';
create index if not exists notifications_inbox_idx
  on public.notifications (recipient_id, created_at desc, id desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update (read_at) on public.notifications to authenticated;
grant all on public.notifications to service_role;
drop policy if exists "Recipients read their notifications" on public.notifications;
create policy "Recipients read their notifications" on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "Recipients mark their notifications read" on public.notifications;
create policy "Recipients mark their notifications read" on public.notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- The event and its notification commit together. Members cannot forge notices.
-- Removing a reaction withdraws its notice; re-adding it creates one new notice.
create or replace function public.notify_article_author() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_recipient uuid;
  v_kind text;
  v_comment uuid;
begin
  v_kind := case TG_TABLE_NAME when 'article_likes' then 'like' when 'favorites' then 'save' else 'comment' end;
  if TG_OP = 'DELETE' then
    delete from public.notifications
      where actor_id = OLD.user_id and article_id = OLD.article_id and kind = v_kind;
    return OLD;
  end if;
  if TG_TABLE_NAME = 'comments' then
    v_actor := NEW.author_id;
    v_comment := NEW.id;
  else
    v_actor := NEW.user_id;
  end if;
  select a.author_id into v_recipient from public.articles a
    where a.id = NEW.article_id and a.status = 'published' and a.published_at <= now();
  if v_recipient is null or v_recipient = v_actor then return NEW; end if;
  insert into public.notifications (recipient_id, actor_id, article_id, kind, comment_id)
    values (v_recipient, v_actor, NEW.article_id, v_kind, v_comment)
    on conflict do nothing;
  return NEW;
end;
$$;
revoke all on function public.notify_article_author() from public, anon, authenticated;
drop trigger if exists article_like_notification on public.article_likes;
create trigger article_like_notification after insert or delete on public.article_likes
  for each row execute function public.notify_article_author();
drop trigger if exists article_save_notification on public.favorites;
create trigger article_save_notification after insert or delete on public.favorites
  for each row execute function public.notify_article_author();
drop trigger if exists article_comment_notification on public.comments;
create trigger article_comment_notification after insert on public.comments
  for each row execute function public.notify_article_author();

-- Start with new interactions only; no historical notification flood.
notify pgrst, 'reload schema';
commit;
