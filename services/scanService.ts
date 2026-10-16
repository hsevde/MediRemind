import { supabase } from '@/services/supabase';
import { MedicineInfo, MedicineScan, MedicineScanInsert } from '@/types/models';

export async function saveMedicineScan(payload: MedicineScanInsert): Promise<MedicineScan> {
  const { data, error } = await supabase.from('medicine_scans').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data as MedicineScan;
}

export async function listMyMedicineScans(userId: string, limit = 10): Promise<MedicineScan[]> {
  const { data, error } = await supabase
    .from('medicine_scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []) as MedicineScan[];
}

export function buildScanInsert(userId: string, info: MedicineInfo): MedicineScanInsert {
  return {
    user_id: userId,
    ilac_adi: info.ilac_adi,
    etken_madde: info.etken_madde,
    scan_data: info,
  };
}
