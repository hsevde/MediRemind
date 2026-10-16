import { supabase } from '@/services/supabase';
import { Profile } from '@/types/models';

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data as Profile;
}

export async function upsertMyProfile(profile: Pick<Profile, 'id' | 'full_name'>) {
  const payload = {
    id: profile.id,
    full_name: profile.full_name,
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}
