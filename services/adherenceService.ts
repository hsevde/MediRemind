import { supabase } from '@/services/supabase';
import { listMyMedications } from '@/services/medicationService';
import { AdherenceStats } from '@/types/models';
import {
  addDaysToDateString,
  countExpectedDosesBetween,
  filterActiveMedications,
  getDayOfMonthInTimezone,
  getMonthStartDateString,
  getReminderTimes,
  getTodayDateString,
  isMedicationActiveOnDate,
} from '@/utils/medicationUtils';

export async function getAdherenceStats(userId: string): Promise<AdherenceStats> {
  const medications = await listMyMedications(userId);
  const monthStart = getMonthStartDateString();
  const today = getTodayDateString();

  const expectedThisMonth = countExpectedDosesBetween(medications, monthStart, today);
  if (expectedThisMonth === 0) {
    return { monthlyPercent: 0, streak: 0, takenThisMonth: 0, expectedThisMonth: 0 };
  }

  const { data: logs, error } = await supabase
    .from('medication_intake_logs')
    .select('intake_date, taken, medication_id')
    .eq('user_id', userId)
    .gte('intake_date', monthStart)
    .lte('intake_date', today);

  if (error) throw error;

  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));
  const takenThisMonth = (logs ?? []).filter((log) => {
    if (!log.taken) return false;
    const medication = medicationById.get(log.medication_id);
    return medication ? isMedicationActiveOnDate(medication, log.intake_date) : false;
  }).length;

  const monthlyPercent =
    expectedThisMonth > 0 ? Math.round((takenThisMonth / expectedThisMonth) * 100) : 0;

  const streak = await calculateStreak(userId, medications);

  return {
    monthlyPercent: Math.min(monthlyPercent, 100),
    streak,
    takenThisMonth,
    expectedThisMonth,
  };
}

async function calculateStreak(
  userId: string,
  medications: Awaited<ReturnType<typeof listMyMedications>>
): Promise<number> {
  let streak = 0;

  for (let offset = 0; offset < getDayOfMonthInTimezone(); offset++) {
    const dateStr = addDaysToDateString(getTodayDateString(), -offset);
    const activeMeds = filterActiveMedications(medications, dateStr);
    const expectedDoses = activeMeds.reduce(
      (sum, medication) => sum + getReminderTimes(medication).length,
      0
    );

    if (expectedDoses === 0) {
      if (offset === 0) continue;
      break;
    }

    const { data: dayLogs } = await supabase
      .from('medication_intake_logs')
      .select('taken, medication_id')
      .eq('user_id', userId)
      .eq('intake_date', dateStr);

    const activeIds = new Set(activeMeds.map((medication) => medication.id));
    const takenCount = (dayLogs ?? []).filter(
      (log) => log.taken && activeIds.has(log.medication_id)
    ).length;

    if (takenCount >= expectedDoses) {
      streak++;
    } else if (offset === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}
