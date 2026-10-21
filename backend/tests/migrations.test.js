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
    '0008_editorial_galleries.sql',
    '0009_beauty_categories.sql',
    '0010_author_follows.sql',
    '0011_featured_articles.sql',
  ])
    await db.exec(await migration(file))
  await db.exec(await migration('0011_featured_articles.sql'))
  await db.exec(await migration('0010_author_follows.sql'))
  await db.exec(await migration('0008_editorial_galleries.sql'))
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

async function addGallery(ownerId, articleId = PA, alt = 'A fabric study') {
  return db.query(
    `insert into public.gallery_images (owner_id,article_id,image_url,thumbnail_url,storage_path,thumbnail_path,width,height,thumbnail_width,alt_text)
 values ($1,$2,'https://example.test/image.webp','https://example.test/thumb.webp',$4,$5,1600,1000,640,$3) returning id`,
    [
      ownerId,
      articleId,
      alt,
      `${ownerId}/image-1600.webp`,
      `${ownerId}/image-640.webp`,
    ],
  )
}
describe('Editorial gallery RLS', () => {
  it('shows published-article galleries, hiding draft and future images', async () => {
    await addGallery(A, PA)
    await addGallery(A, DA)
    await addGallery(A, FA)
    await asRole('anon')
    const { rows } = await db.query(
      'select article_id from public.gallery_images',
    )
    expect(rows).toEqual([{ article_id: PA }])
  })
  it('lets an author view images in their own drafts', async () => {
    await addGallery(A, DA)
    await asRole('authenticated', A)
    expect(
      (await db.query('select id from public.gallery_images')).rows,
    ).toHaveLength(1)
  })
  it('prevents changing or deleting another member captions', async () => {
    await addGallery(A)
    await asRole('authenticated', B)
    expect(
      (
        await db.query(
          "update public.gallery_images set caption='Changed' returning id",
        )
      ).rows,
    ).toEqual([])
    expect(
      (await db.query('delete from public.gallery_images returning id')).rows,
    ).toEqual([])
  })
  it('rejects adding images to an article owned by another member', async () => {
    await asRole('authenticated', A)
    await expect(addGallery(A, PB)).rejects.toMatchObject({ code: '42501' })
  })
  it('rejects a forged owner ID', async () => {
    await asRole('authenticated', A)
    await expect(addGallery(B, PB)).rejects.toMatchObject({ code: '42501' })
  })
  it('allows editing descriptions but forbids replacing stored paths through the Data API', async () => {
    await addGallery(A)
    await asRole('authenticated', A)
    expect(
      (
        await db.query(
          "update public.gallery_images set alt_text='An updated description' returning alt_text",
        )
      ).rows,
    ).toEqual([{ alt_text: 'An updated description' }])
    await expect(
      db.query(
        "update public.gallery_images set storage_path='other/file.webp'",
      ),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('enforces the twelve-image limit at the database boundary', async () => {
    await asRole('authenticated', A)
    for (let i = 0; i < 12; i++) await addGallery(A)
    await expect(addGallery(A)).rejects.toMatchObject({ code: 'P0001' })
  })
  it('keeps each article quota independent', async () => {
    await asRole('authenticated', A)
    for (let i = 0; i < 12; i++) await addGallery(A)
    expect((await addGallery(A, DA)).rows).toHaveLength(1)
  })
  it('requires a non-blank image description', async () => {
    await asRole('authenticated', A)
    await expect(addGallery(A, PA, '   ')).rejects.toMatchObject({
      code: '23514',
    })
  })
  it('cascades gallery records when an article is deleted', async () => {
    await addGallery(A, PA)
    await db.query('delete from public.articles where id=$1', [PA])
    expect(
      (await db.query('select id from public.gallery_images')).rows,
    ).toEqual([])
  })
})

describe('Private follows and personalized article ordering', () => {
  async function follow(follower = A, author = B) {
    return db.query(
      'insert into public.author_follows (follower_id,author_id) values ($1,$2) on conflict do nothing',
      [follower, author],
    )
  }
  async function feed(limit = 10, offset = 0, search = null, category = null) {
    return (
      await db.query(
        'select public.personalized_articles($1,$2,$3,$4) as feed',
        [limit, offset, search, category],
      )
    ).rows[0].feed
  }
  it('keeps follow lists private to their owner', async () => {
    await follow(A, B)
    await follow(B, A)
    await asRole('authenticated', A)
    expect(
      (await db.query('select follower_id from public.author_follows')).rows,
    ).toEqual([{ follower_id: A }])
  })
  it('denies anonymous access to follows and the personalized function', async () => {
    await asRole('anon')
    await expect(
      db.query('select * from public.author_follows'),
    ).rejects.toMatchObject({ code: '42501' })
  })
  it('denies anonymous execution of the personalized function', async () => {
    await asRole('anon')
    await expect(feed()).rejects.toMatchObject({ code: '42501' })
  })
  it('rejects forged follow ownership', async () => {
    await asRole('authenticated', A)
    await expect(follow(B, A)).rejects.toMatchObject({ code: '42501' })
  })
  it('prevents self-following', async () => {
    await asRole('authenticated', A)
    await expect(follow(A, A)).rejects.toMatchObject({ code: '23514' })
  })
  it('allows idempotent follows while preserving another member relationships', async () => {
    await follow(B, A)
    await asRole('authenticated', A)
    await follow(A, B)
    await follow(A, B)
    expect(
      (await db.query('select author_id from public.author_follows')).rows,
    ).toEqual([{ author_id: B }])
    expect(
      (
        await db.query(
          'delete from public.author_follows where follower_id=$1 returning author_id',
          [B],
        )
      ).rows,
    ).toEqual([])
  })
  it('prioritizes followed authors before newer unfollowed stories and keeps pagination stable', async () => {
    await db.query(
      "update public.articles set published_at=now()-interval '1 hour' where id=$1",
      [PA],
    )
    await follow()
    await asRole('authenticated', A)
    const first = await feed(1, 0),
      second = await feed(1, 1),
      pastEnd = await feed(1, 20)
    expect(first.total).toBe(2)
    expect(first.articles.map((a) => a.id)).toEqual([PB])
    expect(first.articles[0].is_followed).toBe(true)
    expect(first.articles[0].author.username).toBe('writer_b')
    expect(first.articles[0].cover_image_variants).toEqual([])
    expect(second.articles.map((a) => a.id)).toEqual([PA])
    expect(second.articles[0].is_followed).toBe(false)
    expect(pastEnd).toEqual({ articles: [], total: 2 })
  })
  it('excludes drafts and scheduled stories, including the reader own work', async () => {
    await follow()
    await asRole('authenticated', A)
    const result = await feed()
    expect(result.articles.map((a) => a.id).sort()).toEqual([PA, PB].sort())
  })
  it('applies search and category filtering before counting and ordering', async () => {
    const category = (
      await db.query("select id from public.categories where slug='beauty'")
    ).rows[0]
    await db.query(
      'insert into public.article_categories (article_id,category_id) values ($1,$2)',
      [PB, category.id],
    )
    await follow()
    await asRole('authenticated', A)
    expect(
      (await feed(10, 0, null, 'beauty')).articles.map((a) => a.id),
    ).toEqual([PB])
    expect(await feed(10, 0, 'Public A', 'beauty')).toEqual({
      articles: [],
      total: 0,
    })
    expect((await feed(10, 0, 'Public B')).total).toBe(1)
  })
  it('uses the signed-in reader follows rather than another member preferences', async () => {
    await follow(A, B)
    await follow(B, A)
    await asRole('authenticated', B)
    const result = await feed()
    expect(result.articles[0]).toMatchObject({ id: PA, is_followed: true })
  })
})

describe('Daily featured stories', () => {
  async function covers() {
    await db.exec(
      "update public.articles set cover_image_url='https://example.test/cover.webp'",
    )
  }
  async function featured(limit = 4) {
    return (
      await db.query('select public.featured_articles($1) as result', [limit])
    ).rows[0].result
  }
  it('ranks the whole published catalogue by likes today and never exposes voters or article bodies', async () => {
    await covers()
    await db.query(
      "insert into auth.users values ('33333333-3333-4333-8333-333333333333')",
    )
    await db.query(
      "insert into public.profiles(id,username,name,surname) values ('33333333-3333-4333-8333-333333333333','third','Third','Reader')",
    )
    await db.query(
      "insert into public.article_likes(user_id,article_id) values ('33333333-3333-4333-8333-333333333333',$1)",
      [PA],
    )
    await asRole('anon')
    const result = await featured(1)
    expect(result.mode).toBe('daily-likes')
    expect(result.timezone).toBe('Europe/Madrid')
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({
      id: PA,
      likes_today: 2,
      author: { username: 'writer_a' },
    })
    expect(result.articles[0]).not.toHaveProperty('user_id')
    expect(result.articles[0]).not.toHaveProperty('content')
  })
  it('uses Madrid midnight boundaries, excludes future votes and falls back to recency without daily likes', async () => {
    await covers()
    await db.query(
      "update public.article_likes set created_at = (date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid') - interval '1 microsecond' where article_id=$1",
      [PA],
    )
    await db.query(
      "update public.article_likes set created_at=now()+interval '1 hour' where article_id=$1",
      [PB],
    )
    await db.query(
      "update public.articles set published_at=now()-interval '1 hour' where id=$1",
      [PB],
    )
    await asRole('anon')
    const result = await featured()
    expect(result.mode).toBe('latest')
    expect(result.articles.map((a) => [a.id, a.likes_today])).toEqual([
      [PB, 0],
      [PA, 0],
    ])
  })
  it('includes likes at Madrid midnight and ignores all-time popularity', async () => {
    await covers()
    await db.query(
      "update public.article_likes set created_at=(date_trunc('day',now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid') where article_id=$1",
      [PA],
    )
    await db.query(
      "update public.article_likes set created_at=now()-interval '2 days' where article_id=$1",
      [PB],
    )
    await asRole('anon')
    expect(
      (await featured()).articles.map((a) => [a.id, a.likes_today]),
    ).toEqual([
      [PA, 1],
      [PB, 0],
    ])
  })
  it('hides drafts and scheduled articles even from their author, and excludes missing covers', async () => {
    await covers()
    await db.query(
      "update public.articles set cover_image_url=' ' where id=$1",
      [PB],
    )
    await asRole('authenticated', A)
    expect((await featured()).articles.map((a) => a.id)).toEqual([PA])
  })
  it('breaks equal votes and publication times by ID consistently for public readers', async () => {
    await covers()
    await asRole('anon')
    const anon = await featured()
    expect(anon.articles.map((a) => a.id)).toEqual([PB, PA])
    await asRole('authenticated', A)
    expect(await featured()).toEqual(anon)
  })
  it('returns an empty recent selection when no published article has a cover', async () => {
    await asRole('anon')
    expect(await featured()).toMatchObject({ articles: [], mode: 'latest' })
  })
})
