-- Keep profile URLs compatible with application routes, including direct Data API writes.
-- NOT VALID preserves legacy rows; new profiles and updates must satisfy the rule.
-- Validate existing rows separately before upgrading an established database.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_url_safe'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_url_safe check (
        username ~ '^[A-Za-z0-9_-]{3,30}$'
        and lower(username) not in (
          'api', 'articles', 'assets', 'categories', 'dashboard', 'login', 'register'
        )
      ) not valid;
  end if;
end;
$$;
