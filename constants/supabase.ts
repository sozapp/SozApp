import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import type { Database } from '@/constants/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // RN'de arka planda sürekli token yenilemeyi durdur; ön plana gelince sürdür.
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (!supabase) return;
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    });
  } catch {
    supabase = null;
  }
}

/** Kullanıcının Supabase hesabını ve tüm verisini kalıcı olarak siler (geri alınamaz). */
export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Bilinmeyen hata.' };
  }
}

/** Kullanıcının sunucudaki hesap verisini JSON olarak indirir (hesap silmeden önce yedek). */
export async function exportUserData(): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Sunucuya bağlanılamıyor.' };
  try {
    const { data, error } = await supabase.functions.invoke('export-user-data', { method: 'POST' });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: String(data.error) };
    if (!data) return { ok: false, error: 'Boş yanıt.' };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Bilinmeyen hata.' };
  }
}

export { supabase };
export default supabase;
