-- Fix: get_caregiver_panel_data içindeki ambiguous scheduled_time hatası
-- Supabase SQL Editor'da çalıştırın

create or replace function public.get_caregiver_panel_data(token_input text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cg record;
  patient_name text;
  meds json;
  doses json;
  week_days json;
  today_total int := 0;
  today_taken int := 0;
  week_missed int := 0;
  month_expected int := 0;
  month_taken int := 0;
  active_count int := 0;
  next_pending text;
begin
  select * into cg from public.caregivers where token = token_input limit 1;
  if cg.id is null then
    return null;
  end if;

  select coalesce(full_name, 'Hasta') into patient_name
  from public.profiles where id = cg.patient_id;

  select count(*) into active_count
  from public.medications where user_id = cg.patient_id;

  select coalesce(json_agg(row_to_json(t)), '[]'::json) into doses
  from (
    select
      m.id as medication_id,
      m.name,
      m.dose,
      t.scheduled_time,
      case
        when dl.status = 'taken' then 'taken'
        when dl.status = 'missed' then 'missed'
        when t.scheduled_time < to_char(now() at time zone 'Europe/Istanbul', 'HH24:MI')
          and coalesce(dl.status, 'pending') != 'taken' then 'missed'
        else coalesce(dl.status, 'pending')
      end as status
    from public.medications m
    cross join lateral (
      select unnest(
        case
          when array_length(m.reminder_times, 1) > 0 then m.reminder_times
          else array[m.reminder_time]
        end
      ) as scheduled_time
    ) t
    left join public.dose_logs dl
      on dl.medication_id = m.id
      and dl.patient_id = cg.patient_id
      and dl.log_date = current_date
      and dl.scheduled_time = t.scheduled_time
    where m.user_id = cg.patient_id
    order by t.scheduled_time
  ) t;

  select count(*) into today_total from json_array_elements(doses);
  select count(*) into today_taken
  from json_array_elements(doses) d
  where d->>'status' = 'taken';

  select coalesce(json_agg(row_to_json(w)), '[]'::json) into week_days
  from (
    select
      to_char(d.day, 'Dy') as label,
      d.day::text as date,
      case
        when expected.cnt = 0 then 'empty'
        when taken.cnt >= expected.cnt then 'complete'
        when missed.cnt > 0 then 'missed'
        else 'partial'
      end as day_status
    from (
      select (current_date - offs) as day
      from generate_series(6, 0, -1) as offs
    ) d
    left join lateral (
      select count(*) as cnt
      from public.medications m
      cross join lateral unnest(
        case when array_length(m.reminder_times, 1) > 0 then m.reminder_times else array[m.reminder_time] end
      ) st
      where m.user_id = cg.patient_id
    ) expected on true
    left join lateral (
      select count(*) as cnt
      from public.dose_logs dl
      where dl.patient_id = cg.patient_id and dl.log_date = d.day and dl.status = 'taken'
    ) taken on true
    left join lateral (
      select count(*) as cnt
      from public.dose_logs dl
      where dl.patient_id = cg.patient_id and dl.log_date = d.day and dl.status = 'missed'
    ) missed on true
    order by d.day
  ) w;

  select count(*) into week_missed
  from public.dose_logs
  where patient_id = cg.patient_id
    and status = 'missed'
    and log_date >= date_trunc('week', current_date)::date;

  select
    coalesce(sum(daily_expected), 0),
    coalesce(sum(daily_taken), 0)
  into month_expected, month_taken
  from (
    select
      g.d::date as day,
      (
        select count(*)
        from public.medications m
        cross join lateral unnest(
          case when array_length(m.reminder_times, 1) > 0 then m.reminder_times else array[m.reminder_time] end
        ) st
        where m.user_id = cg.patient_id
      ) as daily_expected,
      (
        select count(*)
        from public.dose_logs dl
        where dl.patient_id = cg.patient_id and dl.log_date = g.d::date and dl.status = 'taken'
      ) as daily_taken
    from generate_series(
      date_trunc('month', current_date)::date,
      current_date,
      '1 day'::interval
    ) g(d)
  ) sub;

  select coalesce(
    (select m.name || ' saat ' || slot.slot_time
     from public.medications m
     cross join lateral unnest(
       case when array_length(m.reminder_times, 1) > 0 then m.reminder_times else array[m.reminder_time] end
     ) as slot(slot_time)
     left join public.dose_logs dl
       on dl.medication_id = m.id
       and dl.log_date = current_date
       and dl.scheduled_time = slot.slot_time
       and dl.status = 'taken'
     where m.user_id = cg.patient_id
       and dl.id is null
       and slot.slot_time >= to_char(now() at time zone 'Europe/Istanbul', 'HH24:MI')
     order by slot.slot_time
     limit 1),
    'Bugün için bekleyen ilaç kalmadı'
  ) into next_pending;

  return json_build_object(
    'caregiver_email', cg.caregiver_email,
    'patient_name', patient_name,
    'patient_id', cg.patient_id,
    'medications_count', active_count,
    'today_total', today_total,
    'today_taken', today_taken,
    'week_missed', week_missed,
    'month_adherence_percent', case
      when month_expected > 0 then round((month_taken::numeric / month_expected) * 100)
      else 0 end,
    'doses', doses,
    'week_days', week_days,
    'next_notification', next_pending,
    'last_updated', now()
  );
end;
$$;

grant execute on function public.get_caregiver_panel_data(text) to anon, authenticated;
