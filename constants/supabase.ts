import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/constants/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let supabase: ReturnType<typeof createClient<Database>> | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  } catch (e) {
    console.log('Supabase disabled — offline mode');
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

export { supabase };
export default supabase;
