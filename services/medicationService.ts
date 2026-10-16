import { supabase } from '@/services/supabase';
import { Medication, MedicationInsert } from '@/types/models';

export async function listMyMedications(userId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('reminder_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Medication[];
}

export async function addMedication(payload: MedicationInsert): Promise<void> {
  const { error } = await supabase.from('medications').insert(payload);

  if (error) {
    throw error;
  }
}

export async function updateMedication(id: string, payload: Partial<MedicationInsert>): Promise<void> {
  const { error } = await supabase.from('medications').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteMedication(id: string): Promise<void> {
  const { error } = await supabase.from('medications').delete().eq('id', id);
  if (error) throw error;
}
