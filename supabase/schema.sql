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
-- * mj_apply_snapshot() is the store's atomic write path: it upserts every
--   row of the snapshot and deletes rows missing from it, in one
--   transaction. Only service_role may execute it.

create table if not exists users (
  "id" text primary key,
  "email" text not null unique,
  "name" text not null,
  "picture" text,
  "provider" text not null,
  "passwordHash" text,
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

-- Databases created before stock tracking was added pick up the column here;
-- null means "quantity not tracked".
alter table products add column if not exists "stock" integer;
alter table products add column if not exists "images" jsonb not null default '[]'::jsonb;

create index if not exists user_sessions_user_idx on user_sessions ("userId");
create index if not exists orders_user_idx on orders ("userId");
create index if not exists saved_addresses_user_idx on saved_addresses ("userId");

alter table users enable row level security;
alter table user_sessions enable row level security;
alter table admin_sessions enable row level security;
alter table oauth_states enable row level security;
alter table orders enable row level security;
alter table audit enable row level security;
alter table saved_addresses enable row level security;
alter table products enable row level security;
alter table settings enable row level security;

-- Atomic snapshot write used by lib/supabase-store.ts.
create or replace function mj_apply_snapshot(data jsonb)
returns void
language plpgsql
security definer
as $$
begin
  -- users
  delete from users
    where "id" not in (
      select value->>'id' from jsonb_array_elements(coalesce(data->'users', '[]'::jsonb)) where value ? 'id'
    );
  insert into users ("id","email","name","picture","provider","passwordHash","role","createdAt","lastLoginAt")
    select value->>'id', value->>'email', value->>'name', value->>'picture',
           value->>'provider', value->>'passwordHash', coalesce(value->>'role', 'customer'),
           (value->>'createdAt')::bigint, (value->>'lastLoginAt')::bigint
    from jsonb_array_elements(coalesce(data->'users', '[]'::jsonb))
    on conflict ("id") do update set
      "email"=excluded."email", "name"=excluded."name", "picture"=excluded."picture",
      "provider"=excluded."provider", "passwordHash"=excluded."passwordHash",
      "role"=excluded."role", "createdAt"=excluded."createdAt", "lastLoginAt"=excluded."lastLoginAt";

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
  insert into orders ("id","reference","userId","items","subtotal","shipping","total","customer","status","payment","createdAt","updatedAt")
    select value->>'id', value->>'reference', value->>'userId', value->'items',
           (value->>'subtotal')::integer, (value->>'shipping')::integer, (value->>'total')::integer,
           value->'customer', value->>'status', value->'payment',
           (value->>'createdAt')::bigint, (value->>'updatedAt')::bigint
    from jsonb_array_elements(coalesce(data->'orders', '[]'::jsonb))
    on conflict ("id") do update set
      "reference"=excluded."reference", "userId"=excluded."userId", "items"=excluded."items",
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

revoke execute on function mj_apply_snapshot(jsonb) from public;
revoke execute on function mj_apply_snapshot(jsonb) from anon;
revoke execute on function mj_apply_snapshot(jsonb) from authenticated;
grant execute on function mj_apply_snapshot(jsonb) to service_role;
