-- Millet Jar — Supabase schema
-- Run once in: Supabase Dashboard → SQL Editor → New query → paste → Run.
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

revoke execute on function mj_apply_snapshot(jsonb) from public;
revoke execute on function mj_apply_snapshot(jsonb) from anon;
revoke execute on function mj_apply_snapshot(jsonb) from authenticated;
grant execute on function mj_apply_snapshot(jsonb) to service_role;
