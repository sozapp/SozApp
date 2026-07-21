import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { useCallback, useState } from 'react';
import { getTTSLanguage, STORAGE_BIBLE_VERSION } from '@/constants/bibleVersions';

export async function getAvailableVoices() {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.filter((v) => v.language === 'tr-TR' || v.language?.startsWith('tr'));
}

export type VerseForSpeech = { text: string };

// iOS'un varsayılan sesleri dile göre kadın — bu isimler bilinen erkek
// sesler (Cem: Türkçe, Aaron/Fred/Daniel: İngilizce). Cihazda mevcutsa
// bunlardan biri seçilir, yoksa daha düşük perde ile fallback yapılır.
const MALE_VOICE_NAME_HINTS: Record<string, string[]> = {
  'tr-TR': ['cem'],
  'en-US': ['aaron', 'fred', 'daniel'],
};

const FALLBACK_PITCH = 0.85;

async function getCurrentVersion(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(STORAGE_BIBLE_VERSION)) ?? 'TR';
  } catch {
    return 'TR';
  }
}

async function findMaleVoice(language: string): Promise<string | undefined> {
  if (Platform.OS !== 'ios') return undefined;
  const hints = MALE_VOICE_NAME_HINTS[language] ?? [];
  if (hints.length === 0) return undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const langPrefix = language.split('-')[0].toLowerCase();
    const match = voices.find((v) => {
      if (!v.language?.toLowerCase().startsWith(langPrefix)) return false;
      const id = (v.identifier ?? '').toLowerCase();
      const name = (v.name ?? '').toLowerCase();
      return hints.some((hint) => id.includes(hint) || name.includes(hint));
    });
    return match?.identifier;
  } catch {
    return undefined;
  }
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerseId, setCurrentVerseId] = useState<string | null>(null);

  const speakWithVersion = useCallback(async (text: string, verseId: string | null) => {
    const currentVersion = await getCurrentVersion();
    const language = getTTSLanguage(currentVersion);
    const maleVoice = await findMaleVoice(language);
    const rate = language === 'tr-TR' ? 0.85 : 0.9;

    await Speech.stop();
    setCurrentVerseId(verseId);
    setIsSpeaking(true);
    setIsPaused(false);
    Speech.speak(text, {
      language,
      voice: maleVoice,
      pitch: maleVoice ? 1.0 : FALLBACK_PITCH,
      rate,
      onDone: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
      onStopped: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
    });
  }, []);

  const speak = useCallback(
    async (text: string, verseId: string) => {
      await speakWithVersion(text, verseId);
    },
    [speakWithVersion]
  );

  const speakChapter = useCallback(
    async (verses: VerseForSpeech[]) => {
      const fullText = verses.map((v) => v.text).join(' ');
      await speakWithVersion(fullText, 'chapter');
    },
    [speakWithVersion]
  );

  const stop = useCallback(async () => {
    await Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentVerseId(null);
  }, []);

  return { isSpeaking, isPaused, currentVerseId, speak, speakChapter, stop };
}
