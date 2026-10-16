-- MediRemind başlangıç şeması
-- Supabase SQL Editor içinde çalıştırın

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.medications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose text not null,
  reminder_time text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.medications enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can upsert own profile"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read own medications"
on public.medications
for select
using (auth.uid() = user_id);

create policy "Users can insert own medications"
on public.medications
for insert
with check (auth.uid() = user_id);

create policy "Users can update own medications"
on public.medications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own medications"
on public.medications
for delete
using (auth.uid() = user_id);

-- AI ilaç tarama geçmişi
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

-- Çoklu saat desteği
alter table public.medications
  add column if not exists frequency text not null default 'gunluk',
  add column if not exists reminder_times text[] not null default '{}',
  add column if not exists meal_timing text not null default 'farketmez',
  add column if not exists duration_type text not null default 'unlimited',
  add column if not exists duration_days integer,
  add column if not exists end_date date,
  add column if not exists start_date date default current_date;

-- İlaç alım takibi
create table if not exists public.medication_intake_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  intake_date date not null default current_date,
  reminder_time text not null,
  taken boolean not null default false,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (medication_id, intake_date, reminder_time)
);

alter table public.medication_intake_logs enable row level security;

create policy "Users can manage own intake logs"
on public.medication_intake_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Aile bağlantıları
create table if not exists public.family_connections (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  member_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.family_connections enable row level security;

create policy "Users can manage own family connections"
on public.family_connections for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
