-- Upgrade the policy that was created manually in the deployed project.
-- Keep likes attached to drafts and future publications out of the public API.
alter policy "Anyone can read article likes" on public.article_likes
using (exists (
  select 1 from public.articles a
  where a.id = article_id
    and a.status = 'published'
    and a.published_at <= now()
));
