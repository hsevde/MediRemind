import { FunctionsHttpError } from '@supabase/supabase-js';
import Constants from 'expo-constants';

import { supabase } from '@/services/supabase';
import { Caregiver, CaregiverInsert } from '@/types/models';

const extra = Constants.expoConfig?.extra as { panelUrl?: string } | undefined;

const PANEL_BASE_URL =
  process.env.EXPO_PUBLIC_PANEL_URL ??
  extra?.panelUrl ??
  'http://localhost:3000/panel';

function generateToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function listCaregivers(patientId: string): Promise<Caregiver[]> {
  const { data, error } = await supabase
    .from('caregivers')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Caregiver[];
}

type InviteResult = {
  panelUrl: string;
  emailSkipped: boolean;
  emailError?: string;
};

async function trySendInviteEmail(
  email: string,
  token: string,
  patientName: string,
  panelUrl: string
): Promise<InviteResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-caregiver-invite', {
      body: { email, token, patientName },
    });

    if (!error && data) {
      const result = data as { panelUrl?: string; emailSkipped?: boolean; error?: string };
      return {
        panelUrl: result.panelUrl ?? panelUrl,
        emailSkipped: result.emailSkipped ?? false,
        emailError: result.error,
      };
    }

    if (error instanceof FunctionsHttpError) {
      try {
        const body = (await error.context.json()) as {
          panelUrl?: string;
          emailSkipped?: boolean;
          error?: string;
        };
        return {
          panelUrl: body.panelUrl ?? panelUrl,
          emailSkipped: true,
          emailError: body.error ?? error.message,
        };
      } catch {
        // Function deploy edilmemiş veya ağ hatası
      }
    }

    return {
      panelUrl,
      emailSkipped: true,
      emailError: error?.message ?? 'Edge function erişilemedi',
    };
  } catch (e) {
    return {
      panelUrl,
      emailSkipped: true,
      emailError: e instanceof Error ? e.message : 'Bilinmeyen hata',
    };
  }
}

export async function addCaregiver(
  patientId: string,
  caregiverEmail: string,
  patientName: string
): Promise<{ caregiver: Caregiver; panelUrl: string; emailSkipped?: boolean; emailError?: string }> {
  const token = generateToken();

  const payload: CaregiverInsert = {
    patient_id: patientId,
    caregiver_email: caregiverEmail.trim().toLowerCase(),
    token,
  };

  const { data, error } = await supabase.from('caregivers').insert(payload).select().single();

  if (error) throw error;

  const panelUrl = `${PANEL_BASE_URL}?token=${encodeURIComponent(token)}`;
  const invite = await trySendInviteEmail(
    payload.caregiver_email,
    token,
    patientName || 'Hasta',
    panelUrl
  );

  if (invite.emailSkipped && __DEV__ && invite.emailError) {
    console.log('[Caregiver] E-posta atlandı:', invite.emailError);
  }

  return {
    caregiver: data as Caregiver,
    panelUrl: invite.panelUrl,
    emailSkipped: invite.emailSkipped,
    emailError: invite.emailError,
  };
}

export async function removeCaregiver(id: string): Promise<void> {
  const { error } = await supabase.from('caregivers').delete().eq('id', id);
  if (error) throw error;
}

export function getPanelLink(token: string): string {
  return `${PANEL_BASE_URL}?token=${encodeURIComponent(token)}`;
}
