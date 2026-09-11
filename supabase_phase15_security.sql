-- MithraQ Chit Fund: Production security starter
-- Run AFTER supabase_phase10.sql and after enabling Supabase Auth.
-- This removes the public demo policies and requires an authenticated user.

alter table public.mithraq_data enable row level security;

alter table public.mithraq_data add column if not exists owner_id uuid references auth.users(id);

-- Assign existing rows before enabling production policies if you already have demo data.
-- Example (replace with a real authenticated user UUID):
-- update public.mithraq_data set owner_id = '00000000-0000-0000-0000-000000000000' where owner_id is null;

alter table public.mithraq_data alter column owner_id set default auth.uid();

drop policy if exists "mithraq public read" on public.mithraq_data;
drop policy if exists "mithraq public insert" on public.mithraq_data;
drop policy if exists "mithraq public update" on public.mithraq_data;
drop policy if exists "mithraq authenticated select own" on public.mithraq_data;
drop policy if exists "mithraq authenticated insert own" on public.mithraq_data;
drop policy if exists "mithraq authenticated update own" on public.mithraq_data;

create policy "mithraq authenticated select own"
on public.mithraq_data for select to authenticated
using (owner_id = auth.uid());

create policy "mithraq authenticated insert own"
on public.mithraq_data for insert to authenticated
with check (owner_id = auth.uid());

create policy "mithraq authenticated update own"
on public.mithraq_data for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Recommended: enable Email/Password provider in Supabase Auth and configure redirect URLs.
