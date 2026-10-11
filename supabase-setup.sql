-- ============================================================
-- Design Library — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. DESIGNS — designs added through the "Add design" form.
--    Visible to everyone (it is a shared library), editable
--    only by the signed-in owner.
-- ------------------------------------------------------------
create table public.designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text default '',
  tags        text[] default '{}',
  link        text,
  files       jsonb not null default '[]',  -- [{ path, lang, content }]
  preview_html text,                        -- composed preview document
  docs_md     text,                         -- markdown design doc
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.designs enable row level security;

create policy "designs readable by everyone"
  on public.designs for select using (true);

create policy "designs insertable by owner"
  on public.designs for insert with check (auth.uid() = user_id);

create policy "designs updatable by owner"
  on public.designs for update using (auth.uid() = user_id);

create policy "designs deletable by owner"
  on public.designs for delete using (auth.uid() = user_id);

-- keep updated_at fresh automatically
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger designs_touch_updated_at
  before update on public.designs
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. FAVOURITES — one row per starred design per user.
--    design_key is the design id: a builtin slug
--    (e.g. "metro-tiles") or a designs.id uuid.
-- ------------------------------------------------------------
create table public.favourites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  design_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, design_key)
);

alter table public.favourites enable row level security;

create policy "favourites readable by owner"
  on public.favourites for select using (auth.uid() = user_id);

create policy "favourites insertable by owner"
  on public.favourites for insert with check (auth.uid() = user_id);

create policy "favourites deletable by owner"
  on public.favourites for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. (Optional but recommended) Indexes
-- ------------------------------------------------------------
create index designs_user_idx on public.designs (user_id);
create index designs_updated_idx on public.designs (updated_at desc);

-- ============================================================
-- 4. GOOGLE AUTH — enable in the dashboard (no SQL):
--    a) Authentication → Providers → Google → Enable
--    b) Create an OAuth client at console.cloud.google.com
--       (APIs & Services → Credentials → OAuth client ID → Web app)
--       Authorised redirect URI:
--         https://<PROJECT-REF>.supabase.co/auth/v1/callback
--    c) Paste the Client ID + Secret into the Supabase Google provider
--    d) Authentication → URL Configuration → Site URL:
--         your deploy URL (e.g. https://whwgywgr.github.io/design-library/)
--         and add http://localhost:8123/ for local testing
-- ============================================================
