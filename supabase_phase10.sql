-- MithraQ Chit Fund: Cloud Sync table
create table if not exists public.mithraq_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Demo-friendly policies. For production, replace these with authenticated user policies.
alter table public.mithraq_data enable row level security;

drop policy if exists "mithraq public read" on public.mithraq_data;
drop policy if exists "mithraq public insert" on public.mithraq_data;
drop policy if exists "mithraq public update" on public.mithraq_data;

create policy "mithraq public read" on public.mithraq_data for select using (true);
create policy "mithraq public insert" on public.mithraq_data for insert with check (true);
create policy "mithraq public update" on public.mithraq_data for update using (true) with check (true);

alter table public.mithraq_data replica identity full;
-- Enable realtime in the Supabase dashboard if your project does not add the table automatically.
