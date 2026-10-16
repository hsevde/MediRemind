import { DurationType, MealTiming, Medication } from '@/types/models';

export const DEFAULT_DOSE_TIMES = ['08:00', '13:00', '19:00', '22:00'] as const;

export const MEAL_TIMING_OPTIONS: { value: MealTiming; label: string }[] = [
  { value: 'farketmez', label: 'Farketmez' },
  { value: 'yemekten_once', label: 'Yemekten önce' },
  { value: 'yemekten_sonra', label: 'Yemekten sonra' },
  { value: 'tok_karna', label: 'Tok karnına' },
  { value: 'ac_karna', label: 'Aç karnına' },
];

const APP_TIMEZONE = 'Europe/Istanbul';

export function getTodayDateString(): string {
  return formatDateInTimezone(new Date());
}

export function formatDateInTimezone(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(date);
}

export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateInTimezone(date);
}

export function getMonthStartDateString(reference = new Date()): string {
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric' }).format(
    reference
  );
  const m = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, month: '2-digit' }).format(
    reference
  );
  return `${y}-${m}-01`;
}

export function getDayOfMonthInTimezone(reference = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, day: 'numeric' }).format(reference)
  );
}

export function getReminderTimes(medication: Medication): string[] {
  if (medication.reminder_times?.length) {
    return medication.reminder_times;
  }
  return medication.reminder_time ? [medication.reminder_time] : [];
}

export function getTimesPerDay(medication: Medication): number {
  return getReminderTimes(medication).length;
}

export function getFrequencyLabel(medication: Medication): string {
  const count = getTimesPerDay(medication);
  if (count <= 1) return 'Günde 1 kez';
  return `Günde ${count} kez`;
}

export function getMealTimingLabel(value?: MealTiming): string {
  return MEAL_TIMING_OPTIONS.find((o) => o.value === value)?.label ?? 'Farketmez';
}

export function getMedicationStartDate(medication: Medication): string {
  if (medication.start_date) return medication.start_date;
  if (medication.created_at) return medication.created_at.slice(0, 10);
  return getTodayDateString();
}

export function getMedicationEndDate(medication: Medication): string | null {
  const durationType = medication.duration_type ?? 'unlimited';
  const startDate = getMedicationStartDate(medication);

  if (durationType === 'unlimited') return null;
  if (durationType === 'end_date' && medication.end_date) return medication.end_date;
  if (durationType === 'days' && medication.duration_days && medication.duration_days > 0) {
    return addDaysToDateString(startDate, medication.duration_days - 1);
  }
  return null;
}

export function isMedicationActiveOnDate(medication: Medication, dateStr: string): boolean {
  const startDate = getMedicationStartDate(medication);
  if (dateStr < startDate) return false;

  const endDate = getMedicationEndDate(medication);
  if (endDate && dateStr > endDate) return false;

  return true;
}

export function filterActiveMedications(
  medications: Medication[],
  dateStr: string = getTodayDateString()
): Medication[] {
  return medications.filter((med) => isMedicationActiveOnDate(med, dateStr));
}

export function countExpectedDosesBetween(
  medications: Medication[],
  startDate: string,
  endDate: string
): number {
  let total = 0;
  let cursor = startDate;

  while (cursor <= endDate) {
    for (const med of medications) {
      if (isMedicationActiveOnDate(med, cursor)) {
        total += getReminderTimes(med).length;
      }
    }
    cursor = addDaysToDateString(cursor, 1);
  }

  return total;
}

export function getDurationLabel(medication: Medication): string {
  const durationType = medication.duration_type ?? 'unlimited';
  if (durationType === 'unlimited') return 'Süresiz kullanım';
  if (durationType === 'days' && medication.duration_days) {
    return `${medication.duration_days} gün`;
  }
  if (durationType === 'end_date' && medication.end_date) {
    return `Bitiş: ${formatDisplayDate(medication.end_date)}`;
  }
  return 'Süresiz kullanım';
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDateString(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildTimesForCount(count: number, existing: string[] = []): string[] {
  return Array.from({ length: count }, (_, index) => {
    if (existing[index]) return existing[index];
    return DEFAULT_DOSE_TIMES[index] ?? DEFAULT_DOSE_TIMES[DEFAULT_DOSE_TIMES.length - 1];
  });
}

export function formatTimeFromDate(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTimeString(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function parseReminderTimesInput(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t));
}

export function formatReminderTimes(times: string[]): string {
  return times.join(', ');
}
