import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getSupabaseConfig(): { url: string; key: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase anahtarları eksik. mediremind-web/.env.local içine NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
    );
  }

  return { url, key };
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    const { url, key } = getSupabaseConfig();
    client = createClient(url, key);
  }
  return client;
}

export type DoseStatus = 'taken' | 'missed' | 'pending';

export type PanelDose = {
  medication_id: string;
  name: string;
  dose: string;
  scheduled_time: string;
  status: DoseStatus;
};

export type WeekDay = {
  label: string;
  date: string;
  day_status: 'complete' | 'missed' | 'partial' | 'empty';
};

export type PanelData = {
  caregiver_email: string;
  patient_name: string;
  patient_id: string;
  medications_count: number;
  today_total: number;
  today_taken: number;
  week_missed: number;
  month_adherence_percent: number;
  doses: PanelDose[];
  week_days: WeekDay[];
  next_notification: string;
  last_updated: string;
};

export type PanelFetchResult =
  | { ok: true; data: PanelData }
  | { ok: false; reason: 'missing_token' | 'invalid_token' | 'config' | 'rpc'; message: string };

export async function fetchPanelData(token: string): Promise<PanelFetchResult> {
  if (!token.trim()) {
    return { ok: false, reason: 'missing_token', message: 'URL içinde token parametresi yok.' };
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_caregiver_panel_data', {
      token_input: token.trim(),
    });

    if (error) {
      console.error('Panel RPC error:', error.message);
      return {
        ok: false,
        reason: 'rpc',
        message: error.message.includes('get_caregiver_panel_data')
          ? 'Panel fonksiyonu bulunamadı. Supabase SQL Editor’da 003_caregivers_panel.sql dosyasını çalıştırın.'
          : error.message,
      };
    }

    if (!data) {
      return {
        ok: false,
        reason: 'invalid_token',
        message: 'Bu token veritabanında bulunamadı. Uygulamadan yeni bir davet oluşturun.',
      };
    }

    return { ok: true, data: data as PanelData };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
    console.error('fetchPanelData:', e);
    return {
      ok: false,
      reason: message.includes('Supabase') ? 'config' : 'rpc',
      message,
    };
  }
}

export function minutesAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  return `${hours} saat önce`;
}
