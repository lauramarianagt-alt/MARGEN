import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'

// Isolated PostgreSQL: these tests never contact Supabase or use real credentials.
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const PA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const DA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
const FA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
const PB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const DB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const CA = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
const CB = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'
let db
const migration = (file) =>
  readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')
async function asRole(role, userId = '') {
  await db.exec(`set local role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [
    userId,
  ])
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    create schema storage;
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
  `)
  for (const file of [
    '0001_initial_schema.sql',
    '0002_api_grants.sql',
    '0003_profiles_grants.sql',
    '0004_articles_grants.sql',
    '0005_social_and_storage.sql',
    '0006_profile_usernames.sql',
    '0007_public_like_visibility.sql',
  ])
    await db.exec(await migration(file))
  // Verify that additive migrations also accept an existing schema.
  await db.exec(await migration('0005_social_and_storage.sql'))
  await db.exec(await migration('0006_profile_usernames.sql'))
  // Reproduce the permissive policy found on the existing Supabase project.
  await db.exec(
    'alter policy "Anyone can read article likes" on public.article_likes using (true)',
  )
  await db.exec(await migration('0007_public_like_visibility.sql'))
  await db.query('insert into auth.users (id) values ($1),($2)', [A, B])
  await db.query(
    `insert into public.profiles (id,username,name,surname)
    values ($1,'writer_a','Writer','A'),($2,'writer_b','Writer','B')`,
    [A, B],
  )
  await db.query(
    `insert into public.articles (id,author_id,title,slug,status,published_at)
    values ($1,$6,'Public A','public-a','published',now()-interval '1 day'),
           ($2,$6,'Draft A','draft-a','draft',null),
           ($3,$6,'Future A','future-a','published',now()+interval '1 day'),
           ($4,$7,'Public B','public-b','published',now()-interval '1 day'),
           ($5,$7,'Draft B','draft-b','draft',null)`,
    [PA, DA, FA, PB, DB, A, B],
  )
  await db.query(
    `insert into public.comments (id,article_id,author_id,content)
    values ($1,$3,$5,'By A'),($2,$4,$6,'By B')`,
    [CA, CB, PB, PA, A, B],
  )
  await db.query(
    'insert into public.favorites (user_id,article_id) values ($1,$3),($2,$4)',
    [A, B, PB, PA],
  )
  await db.query(
    'insert into public.article_likes (user_id,article_id) values ($1,$3),($2,$4)',
    [A, B, PB, PA],
  )
}, 30_000)

beforeEach(async () => {
  await db.exec('begin')
})
afterEach(async () => {
  await db.exec('rollback')
})
afterAll(async () => {
  await db?.close()
})

describe('Fresh migrations and two-user RLS permissions', () => {
  it('creates the public cover bucket with a 6 MB limit and allowed image types', async () => {
    const { rows } = await db.query(
      "select * from storage.buckets where id='article-covers'",
    )
    expect(rows[0]).toMatchObject({ public: true, file_size_limit: 6291456 })
    expect(rows[0].allowed_mime_types).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
  })
  it('shows anonymous readers only articles whose publication time has arrived', async () => {
    await asRole('anon')
    expect(
      (await db.query('select id from public.articles order by id')).rows.map(
        (r) => r.id,
      ),
    ).toEqual([PA, PB])
  })
  it('shows an author their own drafts and scheduled articles but hides another author drafts', async () => {
    await asRole('authenticated', A)
    expect(
      (await db.query('select id from public.articles order by id')).rows.map(
        (r) => r.id,
      ),
    ).toEqual([PA, DA, FA, PB])
  })
  it('prevents editing and deleting another author article', async () => {
    await asRole('authenticated', B)
    expect(
      (
        await db.query(
          "update public.articles set title='Changed' where id=$1 returning id",
          [PA],
        )
      ).rows,
    ).toEqual([])
    expect(
      (
        await db.query('delete from public.articles where id=$1 returning id', [
          PA,
        ])
      ).rows,
    ).toEqual([])
  })
  it('rejects forged article authorship', async () => {
    await asRole('authenticated', A)
    await expect(
      db.query(
        "insert into public.articles (author_id,title,slug) values ($1,'Forged','forged')",
        [B],
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('keeps each member favorites private', async () => {
    await asRole('authenticated', A)
    expect(
      (await db.query('select user_id from public.favorites')).rows,
    ).toEqual([{ user_id: A }])
  })
  it('denies anonymous access to favorites', async () => {
    await asRole('anon')
    await expect(
      db.query('select * from public.favorites'),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('rejects saving favorites under another member identity', async () => {
    await asRole('authenticated', A)
    await expect(
      db.query(
        'insert into public.favorites (user_id,article_id) values ($1,$2)',
        [B, PB],
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('allows commenting on another public article', async () => {
    await asRole('authenticated', A)
    expect(
      (
        await db.query(
          "insert into public.comments (article_id,author_id,content) values ($1,$2,'New') returning author_id",
          [PB, A],
        )
      ).rows,
    ).toEqual([{ author_id: A }])
  })
  it('rejects commenting on the member own article', async () => {
    await asRole('authenticated', A)
    await expect(
      db.query(
        "insert into public.comments (article_id,author_id,content) values ($1,$2,'Own')",
        [PA, A],
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('rejects commenting on an unpublished article', async () => {
    await asRole('authenticated', B)
    await expect(
      db.query(
        "insert into public.comments (article_id,author_id,content) values ($1,$2,'Hidden')",
        [DA, B],
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('rejects a forged comment author', async () => {
    await asRole('authenticated', A)
    await expect(
      db.query(
        "insert into public.comments (article_id,author_id,content) values ($1,$2,'Forged')",
        [PA, B],
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('permits deleting only the member own comments', async () => {
    await asRole('authenticated', A)
    expect(
      (
        await db.query('delete from public.comments where id=$1 returning id', [
          CB,
        ])
      ).rows,
    ).toEqual([])
    expect(
      (
        await db.query('delete from public.comments where id=$1 returning id', [
          CA,
        ])
      ).rows,
    ).toEqual([{ id: CA }])
  })
  it('hides comments when their article returns to draft', async () => {
    await db.query(
      "update public.articles set status='draft',published_at=null where id=$1",
      [PA],
    )
    await asRole('anon')
    expect((await db.query('select id from public.comments')).rows).toEqual([
      { id: CA },
    ])
  })
  it.each([
    ['draft', null],
    ['published', '2099-01-01T00:00:00Z'],
  ])(
    'hides existing likes when an article becomes %s or is scheduled in the future',
    async (status, publishedAt) => {
      await db.query(
        'update public.articles set status=$1,published_at=$2 where id=$3',
        [status, publishedAt, PA],
      )
      await asRole('anon')
      expect(
        (await db.query('select user_id from public.article_likes')).rows,
      ).toEqual([{ user_id: A }])
    },
  )
  it('rejects liking the member own article', async () => {
    await asRole('authenticated', A)
    await expect(
      db.query(
        'insert into public.article_likes (user_id,article_id) values ($1,$2)',
        [A, PA],
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('permits removing only the member own likes', async () => {
    await asRole('authenticated', A)
    expect(
      (
        await db.query(
          'delete from public.article_likes where user_id=$1 returning user_id',
          [B],
        )
      ).rows,
    ).toEqual([])
    expect(
      (
        await db.query(
          'delete from public.article_likes where user_id=$1 returning user_id',
          [A],
        )
      ).rows,
    ).toEqual([{ user_id: A }])
  })
  it('enforces reserved usernames on direct profile updates', async () => {
    await asRole('authenticated', A)
    await expect(
      db.query("update public.profiles set username='LOGIN' where id=$1", [A]),
    ).rejects.toMatchObject({ code: '23514' })
  })
})
