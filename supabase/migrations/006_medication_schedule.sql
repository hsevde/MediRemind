-- İlaç kullanım zamanı ve süre alanları
-- Supabase SQL Editor'da çalıştırın

alter table public.medications
  add column if not exists meal_timing text not null default 'farketmez',
  add column if not exists duration_type text not null default 'unlimited',
  add column if not exists duration_days integer,
  add column if not exists end_date date,
  add column if not exists start_date date default current_date;
