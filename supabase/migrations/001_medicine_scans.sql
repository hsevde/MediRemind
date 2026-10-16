-- Mevcut projeye medicine_scans tablosunu ekler
-- Supabase SQL Editor'da çalıştırın

create table if not exists public.medicine_scans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ilac_adi text not null,
  etken_madde text,
  scan_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists medicine_scans_user_id_idx on public.medicine_scans (user_id, created_at desc);

alter table public.medicine_scans enable row level security;

create policy "Users can read own medicine scans"
on public.medicine_scans
for select
using (auth.uid() = user_id);

create policy "Users can insert own medicine scans"
on public.medicine_scans
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own medicine scans"
on public.medicine_scans
for delete
using (auth.uid() = user_id);
