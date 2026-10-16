import { supabase } from '@/services/supabase';
import { listMyMedications } from '@/services/medicationService';
import { MedicationIntakeLog, TodayDose } from '@/types/models';
import { getReminderTimes, getTodayDateString, filterActiveMedications } from '@/utils/medicationUtils';

export async function getTodayDoses(userId: string): Promise<TodayDose[]> {
  const today = getTodayDateString();
  const medications = filterActiveMedications(await listMyMedications(userId), today);

  const { data: logs, error } = await supabase
    .from('medication_intake_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('intake_date', today);

  if (error) {
    throw error;
  }

  const logMap = new Map<string, MedicationIntakeLog>();
  for (const log of (logs ?? []) as MedicationIntakeLog[]) {
    logMap.set(`${log.medication_id}_${log.reminder_time}`, log);
  }

  const doses: TodayDose[] = [];

  for (const med of medications) {
    for (const time of getReminderTimes(med)) {
      const key = `${med.id}_${time}`;
      const log = logMap.get(key);
      doses.push({
        medicationId: med.id,
        medicationName: med.name,
        dose: med.dose,
        reminderTime: time,
        taken: log?.taken ?? false,
        logId: log?.id,
      });
    }
  }

  return doses.sort((a, b) => a.reminderTime.localeCompare(b.reminderTime));
}

export async function toggleDoseTaken(
  userId: string,
  medicationId: string,
  reminderTime: string,
  taken: boolean
): Promise<void> {
  const today = getTodayDateString();

  const { data: existing } = await supabase
    .from('medication_intake_logs')
    .select('id')
    .eq('medication_id', medicationId)
    .eq('intake_date', today)
    .eq('reminder_time', reminderTime)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('medication_intake_logs')
      .update({ taken, taken_at: taken ? new Date().toISOString() : null })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('medication_intake_logs').insert({
      user_id: userId,
      medication_id: medicationId,
      intake_date: today,
      reminder_time: reminderTime,
      taken,
      taken_at: taken ? new Date().toISOString() : null,
    });
    if (error) throw error;
  }
}

export function buildTodayIntakeSummary(doses: TodayDose[]): string {
  if (doses.length === 0) {
    return 'Bugün için kayıtlı ilaç hatırlatman yok.';
  }

  const taken = doses.filter((d) => d.taken);
  const pending = doses.filter((d) => !d.taken);

  let summary = `Bugün ${doses.length} ilaç dozun var. ${taken.length} tanesini aldın`;

  if (taken.length > 0) {
    summary += `: ${taken.map((d) => `${d.medicationName} (${d.reminderTime})`).join(', ')}`;
  }

  if (pending.length > 0) {
    summary += `. Henüz almadıkların: ${pending.map((d) => `${d.medicationName} (${d.reminderTime})`).join(', ')}`;
  } else {
    summary += '. Tebrikler, bugünkü tüm ilaçlarını aldın!';
  }

  return summary;
}
