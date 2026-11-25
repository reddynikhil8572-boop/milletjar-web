-- Millet Jar — Supabase schema
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Safe to re-run: everything here is idempotent, so existing databases pick up
-- new tables (products, settings) and the updated mj_apply_snapshot().
--
-- Notes:
-- * Columns are camelCase (quoted) so PostgREST rows map 1:1 to the app's
--   TypeScript types. Always quote them when writing manual SQL.
-- * RLS is enabled with no policies: the anon/authenticated keys can read
--   nothing. The app talks to these tables only with the service_role key,
--   which bypasses RLS.
-- * mj_apply_snapshot() is the store's atomic write path: it checks a version
--   counter, then upserts every row of the snapshot and deletes rows missing
--   from it in one transaction. A stale version is rejected so concurrent
--   writers cannot delete each other's rows. Only service_role may execute it.
-- * db_meta holds that version; rate_limits backs the shared request limiter.

create table if not exists users (
  "id" text primary key,
  "email" text not null unique,
  "name" text not null,
  "picture" text,
  "provider" text not null,
  "passwordHash" text,
  "googleSub" text,
  "role" text not null default 'customer',
  "createdAt" bigint not null,
  "lastLoginAt" bigint not null
);

create table if not exists user_sessions (
  "id" text primary key,
  "userId" text not null,
  "csrf" text not null,
  "createdAt" bigint not null,
  "expiresAt" bigint not null,
  "lastSeenAt" bigint not null
);

create table if not exists admin_sessions (
  "id" text primary key,
  "email" text not null,
  "csrf" text not null,
  "createdAt" bigint not null,
  "expiresAt" bigint not null,
  "lastSeenAt" bigint not null
);

create table if not exists oauth_states (
  "state" text primary key,
  "verifier" text not null,
  "createdAt" bigint not null,
  "next" text
);

create table if not exists orders (
  "id" text primary key,
  "reference" text not null,
  "requestId" text,
  "userId" text not null,
  "items" jsonb not null,
  "subtotal" integer not null,
  "shipping" integer not null,
  "total" integer not null,
  "customer" jsonb not null,
  "status" text not null,
  "payment" jsonb not null,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

create table if not exists audit (
  "id" text primary key,
  "actor" text not null,
  "actorId" text not null,
  "action" text not null,
  "target" text,
  "ip" text,
  "createdAt" bigint not null
);

create table if not exists saved_addresses (
  "id" text primary key,
  "userId" text not null,
  "name" text not null,
  "phone" text not null,
  "address" text not null,
  "city" text,
  "pincode" text not null,
  "slot" text,
  "createdAt" bigint not null
);

-- Catalog managed from /admin. `price` is what the customer pays;
-- `compareAtPrice` is the MRP shown struck through (null = no discount).
create table if not exists products (
  "id" text primary key,
  "name" text not null,
  "slug" text not null unique,
  "description" text not null default '',
  "price" integer not null,
  "compareAtPrice" integer,
  "image" text not null,
  "images" jsonb not null default '[]'::jsonb,
  "category" text not null default 'millet',
  "labels" jsonb not null default '[]'::jsonb,
  "inStock" boolean not null default true,
  "stock" integer,
  "createdAt" bigint not null,
  "updatedAt" bigint not null
);

-- Generic key/value rows (settings keys: announcements, catalogSeeded).
create table if not exists settings (
  "key" text primary key,
  "value" jsonb
);

-- Compare-and-swap version for the whole snapshot. The app increments it on
-- every accepted write and refuses a write whose expected version is stale.
create table if not exists db_meta (
  "id" text primary key,
  "version" bigint not null default 0,
  "updatedAt" bigint not null
);

-- Shared fixed-window counters for route-level rate limits.
create table if not exists rate_limits (
  "key" text primary key,
  "count" integer not null,
  "resetAt" bigint not null
);

-- Databases created before stock tracking was added pick up the column here;
-- null means "quantity not tracked".
alter table products add column if not exists "stock" integer;
alter table products add column if not exists "images" jsonb not null default '[]'::jsonb;
alter table users add column if not exists "googleSub" text;
alter table orders add column if not exists "requestId" text;

create index if not exists user_sessions_user_idx on user_sessions ("userId");
create index if not exists orders_user_idx on orders ("userId");
create index if not exists saved_addresses_user_idx on saved_addresses ("userId");
create unique index if not exists users_google_sub_key on users ("googleSub") where "googleSub" is not null;
create unique index if not exists orders_user_request_key on orders ("userId", "requestId") where "requestId" is not null;

insert into db_meta ("id", "version", "updatedAt")
values ('single', 0, (extract(epoch from now()) * 1000)::bigint)
on conflict ("id") do nothing;

alter table users enable row level security;
alter table user_sessions enable row level security;
alter table admin_sessions enable row level security;
alter table oauth_states enable row level security;
alter table orders enable row level security;
alter table audit enable row level security;
alter table saved_addresses enable row level security;
alter table products enable row level security;
alter table settings enable row level security;
alter table db_meta enable row level security;
alter table rate_limits enable row level security;

-- Atomic snapshot write used by lib/supabase-store.ts.
-- Replaced (not altered) because the return type changed from void to bigint.
drop function if exists mj_apply_snapshot(jsonb);
create or replace function mj_apply_snapshot(data jsonb, expected_version bigint default null)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_version bigint;
  next_version bigint;
begin
  insert into db_meta ("id", "version", "updatedAt")
  values ('single', 0, (extract(epoch from now()) * 1000)::bigint)
  on conflict ("id") do nothing;

  select "version" into current_version from db_meta where "id" = 'single' for update;

  if expected_version is not null and current_version <> expected_version then
    raise exception 'version conflict' using errcode = '40001';
  end if;

  next_version := current_version + 1;
  update db_meta
    set "version" = next_version,
        "updatedAt" = (extract(epoch from now()) * 1000)::bigint
    where "id" = 'single';
  -- users
  delete from users
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'users', '[]'::jsonb)) where value ? 'id'
    );
  insert into users ("id","email","name","picture","provider","passwordHash","googleSub","role","createdAt","lastLoginAt")
    select value->>'id', value->>'email', value->>'name', value->>'picture',
           value->>'provider', value->>'passwordHash', value->>'googleSub',
           coalesce(value->>'role', 'customer'),
           (value->>'createdAt')::bigint, (value->>'lastLoginAt')::bigint
    from jsonb_array_elements(coalesce(data->'users', '[]'::jsonb))
    on conflict ("id") do update set
      "email"=excluded."email", "name"=excluded."name", "picture"=excluded."picture",
      "provider"=excluded."provider", "passwordHash"=excluded."passwordHash",
      "googleSub"=excluded."googleSub", "role"=excluded."role",
      "createdAt"=excluded."createdAt", "lastLoginAt"=excluded."lastLoginAt";

  -- user_sessions
  delete from user_sessions
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'sessions', '[]'::jsonb)) where value ? 'id'
    );
  insert into user_sessions ("id","userId","csrf","createdAt","expiresAt","lastSeenAt")
    select value->>'id', value->>'userId', value->>'csrf',
           (value->>'createdAt')::bigint, (value->>'expiresAt')::bigint, (value->>'lastSeenAt')::bigint
    from jsonb_array_elements(coalesce(data->'sessions', '[]'::jsonb))
    on conflict ("id") do update set
      "userId"=excluded."userId", "csrf"=excluded."csrf",
      "createdAt"=excluded."createdAt", "expiresAt"=excluded."expiresAt", "lastSeenAt"=excluded."lastSeenAt";

  -- admin_sessions
  delete from admin_sessions
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'adminSessions', '[]'::jsonb)) where value ? 'id'
    );
  insert into admin_sessions ("id","email","csrf","createdAt","expiresAt","lastSeenAt")
    select value->>'id', value->>'email', value->>'csrf',
           (value->>'createdAt')::bigint, (value->>'expiresAt')::bigint, (value->>'lastSeenAt')::bigint
    from jsonb_array_elements(coalesce(data->'adminSessions', '[]'::jsonb))
    on conflict ("id") do update set
      "email"=excluded."email", "csrf"=excluded."csrf",
      "createdAt"=excluded."createdAt", "expiresAt"=excluded."expiresAt", "lastSeenAt"=excluded."lastSeenAt";

  -- oauth_states
  delete from oauth_states
    where "state" not in (
      select value->>'state' from jsonb_array_elements(coalesce(data->'oauthStates', '[]'::jsonb)) where value ? 'state'
    );
  insert into oauth_states ("state","verifier","createdAt","next")
    select value->>'state', value->>'verifier', (value->>'createdAt')::bigint, value->>'next'
    from jsonb_array_elements(coalesce(data->'oauthStates', '[]'::jsonb))
    on conflict ("state") do update set
      "verifier"=excluded."verifier", "createdAt"=excluded."createdAt", "next"=excluded."next";

  -- orders
  delete from orders
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'orders', '[]'::jsonb)) where value ? 'id'
    );
  insert into orders ("id","reference","requestId","userId","items","subtotal","shipping","total","customer","status","payment","createdAt","updatedAt")
    select value->>'id', value->>'reference', value->>'requestId', value->>'userId', value->'items',
           (value->>'subtotal')::integer, (value->>'shipping')::integer, (value->>'total')::integer,
           value->'customer', value->>'status', value->'payment',
           (value->>'createdAt')::bigint, (value->>'updatedAt')::bigint
    from jsonb_array_elements(coalesce(data->'orders', '[]'::jsonb))
    on conflict ("id") do update set
      "reference"=excluded."reference", "requestId"=excluded."requestId",
      "userId"=excluded."userId", "items"=excluded."items",
      "subtotal"=excluded."subtotal", "shipping"=excluded."shipping", "total"=excluded."total",
      "customer"=excluded."customer", "status"=excluded."status", "payment"=excluded."payment",
      "createdAt"=excluded."createdAt", "updatedAt"=excluded."updatedAt";

  -- audit
  delete from audit
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'audit', '[]'::jsonb)) where value ? 'id'
    );
  insert into audit ("id","actor","actorId","action","target","ip","createdAt")
    select value->>'id', value->>'actor', value->>'actorId', value->>'action',
           value->>'target', value->>'ip', (value->>'createdAt')::bigint
    from jsonb_array_elements(coalesce(data->'audit', '[]'::jsonb))
    on conflict ("id") do update set
      "actor"=excluded."actor", "actorId"=excluded."actorId", "action"=excluded."action",
      "target"=excluded."target", "ip"=excluded."ip", "createdAt"=excluded."createdAt";

  -- products
  delete from products
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'products', '[]'::jsonb)) where value ? 'id'
    );
  insert into products ("id","name","slug","description","price","compareAtPrice","image","images","category","labels","inStock","stock","createdAt","updatedAt")
    select value->>'id', value->>'name', value->>'slug', coalesce(value->>'description', ''),
           (value->>'price')::integer, (value->>'compareAtPrice')::integer,
           value->>'image', coalesce(value->'images', '[]'::jsonb),
           coalesce(value->>'category', 'millet'),
           coalesce(value->'labels', '[]'::jsonb),
           coalesce((value->>'inStock')::boolean, true),
           (value->>'stock')::integer,
           (value->>'createdAt')::bigint, (value->>'updatedAt')::bigint
    from jsonb_array_elements(coalesce(data->'products', '[]'::jsonb))
    on conflict ("id") do update set
      "name"=excluded."name", "slug"=excluded."slug", "description"=excluded."description",
      "price"=excluded."price", "compareAtPrice"=excluded."compareAtPrice",
      "image"=excluded."image", "images"=excluded."images",
      "category"=excluded."category", "labels"=excluded."labels",
      "inStock"=excluded."inStock", "stock"=excluded."stock",
      "updatedAt"=excluded."updatedAt";

  -- settings
  delete from settings
    where "key" not in (
      select value->>'key' from jsonb_array_elements(coalesce(data->'settings', '[]'::jsonb)) where value ? 'key'
    );
  insert into settings ("key","value")
    select value->>'key', value->'value'
    from jsonb_array_elements(coalesce(data->'settings', '[]'::jsonb))
    on conflict ("key") do update set "value"=excluded."value";

  -- saved_addresses
  delete from saved_addresses
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'savedAddresses', '[]'::jsonb)) where value ? 'id'
    );
  insert into saved_addresses ("id","userId","name","phone","address","city","pincode","slot","createdAt")
    select value->>'id', value->>'userId', value->>'name', value->>'phone', value->>'address',
           value->>'city', value->>'pincode', value->>'slot', (value->>'createdAt')::bigint
    from jsonb_array_elements(coalesce(data->'savedAddresses', '[]'::jsonb))
    on conflict ("id") do update set
      "userId"=excluded."userId", "name"=excluded."name", "phone"=excluded."phone",
      "address"=excluded."address", "city"=excluded."city", "pincode"=excluded."pincode",
      "slot"=excluded."slot", "createdAt"=excluded."createdAt";

  return next_version;
end;
$$;

-- Storage bucket for product images uploaded from /admin.
-- storage.buckets is an ordinary table, so this is safe to run from SQL Editor.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'Product images',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do nothing;

-- Atomic shared rate limiter. One row per key; returns allowed + retryAfter.
create or replace function mj_rate_limit(p_key text, p_limit integer, p_window_ms bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now bigint := (extract(epoch from now()) * 1000)::bigint;
  v_count integer;
  v_reset bigint;
begin
  insert into rate_limits ("key", "count", "resetAt")
  values (left(p_key, 200), 1, v_now + p_window_ms)
  on conflict ("key") do update set
    "count" = case when rate_limits."resetAt" <= v_now then 1 else rate_limits."count" + 1 end,
    "resetAt" = case when rate_limits."resetAt" <= v_now then v_now + p_window_ms else rate_limits."resetAt" end
  returning "count", "resetAt" into v_count, v_reset;

  if random() < 0.01 then
    delete from rate_limits where "resetAt" < v_now - 86_400_000;
  end if;

  if v_count > p_limit then
    return jsonb_build_object(
      'allowed', false,
      'retryAfter', greatest(1, ceil((v_reset - v_now) / 1000.0)::integer)
    );
  end if;
  return jsonb_build_object('allowed', true, 'retryAfter', 0);
end;
$$;

revoke all on db_meta, rate_limits from anon, authenticated;
grant all on db_meta, rate_limits to service_role;

revoke all on function mj_apply_snapshot(jsonb, bigint) from public;
revoke all on function mj_apply_snapshot(jsonb, bigint) from anon;
revoke all on function mj_apply_snapshot(jsonb, bigint) from authenticated;
grant execute on function mj_apply_snapshot(jsonb, bigint) to service_role;

revoke all on function mj_rate_limit(text, integer, bigint) from public;
revoke all on function mj_rate_limit(text, integer, bigint) from anon;
revoke all on function mj_rate_limit(text, integer, bigint) from authenticated;
grant execute on function mj_rate_limit(text, integer, bigint) to service_role;
