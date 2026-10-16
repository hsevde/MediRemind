-- İlaç alım takibi, çoklu saat ve aile bağlantıları
-- Supabase SQL Editor'da çalıştırın

alter table public.medications
  add column if not exists frequency text not null default 'gunluk',
  add column if not exists reminder_times text[] not null default '{}';

update public.medications
set reminder_times = array[reminder_time]
where array_length(reminder_times, 1) is null or reminder_times = '{}';

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

create index if not exists intake_logs_user_date_idx
  on public.medication_intake_logs (user_id, intake_date desc);

alter table public.medication_intake_logs enable row level security;

create policy "Users can read own intake logs"
on public.medication_intake_logs for select
using (auth.uid() = user_id);

create policy "Users can insert own intake logs"
on public.medication_intake_logs for insert
with check (auth.uid() = user_id);

create policy "Users can update own intake logs"
on public.medication_intake_logs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own intake logs"
on public.medication_intake_logs for delete
using (auth.uid() = user_id);

create table if not exists public.family_connections (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  member_name text,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

create index if not exists family_connections_owner_idx
  on public.family_connections (owner_id);

alter table public.family_connections enable row level security;

create policy "Users can read own family connections"
on public.family_connections for select
using (auth.uid() = owner_id);

create policy "Users can insert own family connections"
on public.family_connections for insert
with check (auth.uid() = owner_id);

create policy "Users can update own family connections"
on public.family_connections for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own family connections"
on public.family_connections for delete
using (auth.uid() = owner_id);
