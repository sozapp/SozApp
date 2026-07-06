import type { User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { newTestament } from '@/constants/new-testament';

export const SHARE_ACTIVITY_KEY = '@soz/shareActivity';

export function isRealAccount(user: User | null): boolean {
  if (!user) return false;
  if (user.is_anonymous === true) return false;
  const email = user.email?.trim();
  if (!email) return false;
  return true;
}

export async function getShareActivityEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SHARE_ACTIVITY_KEY);
    if (v === null) return true;
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setShareActivityEnabled(value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SHARE_ACTIVITY_KEY, value ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export type FriendActivityPayload = {
  type: string;
  verse_id?: string | null;
  book?: string | null;
  chapter?: number | null;
  note?: string | null;
};

export async function logFriendActivity(
  supabase: SupabaseClient | null,
  user: User | null,
  isOnline: boolean,
  payload: FriendActivityPayload
): Promise<void> {
  if (!supabase || !isOnline || !isRealAccount(user)) return;
  try {
    const share = await getShareActivityEnabled();
    if (!share) return;
    const { error } = await supabase.from('friend_activity').insert({
      user_id: user!.id,
      type: payload.type,
      verse_id: payload.verse_id ?? null,
      book: payload.book ?? null,
      chapter: payload.chapter ?? null,
      note: payload.note ?? null,
    });
    if (error) throw error;
  } catch {
    /* offline / RLS / network */
  }
}

export function verseIdToReadParams(verseId: string): { bookId: string; chapter: string } | null {
  try {
    const parts = verseId.split('-');
    if (parts.length < 3) return null;
    const chapterNum = parts[parts.length - 2];
    const bookName = parts.slice(0, -2).join('-');
    const book = newTestament.find((b) => b.name === bookName);
    if (!book) return null;
    if (Number.isNaN(parseInt(chapterNum, 10))) return null;
    return { bookId: book.id, chapter: chapterNum };
  } catch {
    return null;
  }
}

export function bookNameToReadParams(
  bookName: string,
  chapter: number
): { bookId: string; chapter: string } | null {
  if (bookName === 'Mezmurlar' || bookName === 'Mez') {
    return { bookId: 'psalms', chapter: String(chapter) };
  }
  const book = newTestament.find((b) => b.name === bookName);
  if (!book) return null;
  return { bookId: book.id, chapter: String(chapter) };
}

export function formatActivityTimeShort(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'şimdi';
    if (m < 60) return `${m} dk`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} sa`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'dün';
    if (d < 7) return `${d} g`;
    return `${Math.floor(d / 7)} hf`;
  } catch {
    return '';
  }
}

export function formatActivityTimeLong(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Az önce';
    if (m < 60) return `${m} dakika önce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} saat önce`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'Dün';
    if (d < 7) return `${d} gün önce`;
    return `${Math.floor(d / 7)} hafta önce`;
  } catch {
    return '';
  }
}

export function activityDescription(
  type: string,
  verse_id: string | null,
  book: string | null,
  chapter: number | null,
  note: string | null,
  displayName: string
): string {
  const ref =
    verse_id && verse_id.split('-').length >= 3
      ? (() => {
          const p = verse_id.split('-');
          const v = p[p.length - 1];
          const c = p[p.length - 2];
          const bn = p.slice(0, -2).join('-');
          return `${bn} ${c}:${v}`;
        })()
    : book && chapter != null
      ? `${book} ${chapter}`
      : '';

  switch (type) {
    case 'chapter_read':
      return book && chapter != null ? `${displayName} ${book} ${chapter}'ü okudu` : `${displayName} okudu`;
    case 'verse_favorite':
      return ref ? `${displayName} ${ref}'u favoriledi` : `${displayName} ayet favoriledi`;
    case 'verse_highlight':
      return ref ? `${displayName} ${ref}'yi vurguladı` : `${displayName} ayet vurguladı`;
    case 'note_added':
      return ref ? `${displayName} ${ref} için not ekledi` : `${displayName} not ekledi`;
    case 'plan_day_complete':
      return note
        ? `${displayName} «${note}» planında ilerledi`
        : `${displayName} plan gününü tamamladı`;
    case 'plan_started':
      return note ? `${displayName} «${note}» planını başlattı` : `${displayName} okuma planı başlattı`;
    default:
      return `${displayName} aktivite`;
  }
}

export function lastActivityLine(
  type: string,
  verse_id: string | null,
  book: string | null,
  chapter: number | null,
  note: string | null
): string {
  const ref =
    verse_id && verse_id.split('-').length >= 3
      ? (() => {
          const p = verse_id.split('-');
          const v = p[p.length - 1];
          const c = p[p.length - 2];
          const bn = p.slice(0, -2).join('-');
          return `${bn} ${c}:${v}`;
        })()
    : '';

  switch (type) {
    case 'chapter_read':
      return book && chapter != null ? `${book} ${chapter}'ü okudu` : 'Okuma';
    case 'verse_favorite':
      return ref ? `${ref}'u favoriledi` : 'Favori';
    case 'verse_highlight':
      return ref ? `${ref}'yi vurguladı` : 'Vurgu';
    case 'note_added':
      return ref ? `${ref} notu` : 'Not';
    case 'plan_day_complete':
      return note ? `${note} · gün tamamlandı` : 'Plan günü tamamlandı';
    case 'plan_started':
      return note ? `${note} planını başlattı` : 'Plan başlattı';
    default:
      return 'Aktivite';
  }
}
