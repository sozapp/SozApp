import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useCallback, useState } from 'react';
import { getTTSLanguage, STORAGE_BIBLE_VERSION } from '@/constants/bibleVersions';

export async function getAvailableVoices() {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.filter((v) => v.language === 'tr-TR' || v.language?.startsWith('tr'));
}

export type VerseForSpeech = { text: string };

async function getCurrentVersion(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(STORAGE_BIBLE_VERSION)) ?? 'TR';
  } catch {
    return 'TR';
  }
}

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerseId, setCurrentVerseId] = useState<string | null>(null);

  const speakWithVersion = useCallback(async (text: string, verseId: string | null) => {
    const currentVersion = await getCurrentVersion();
    const language = getTTSLanguage(currentVersion);
    const rate = language === 'tr-TR' ? 0.85 : 0.9;

    await Speech.stop();
    setCurrentVerseId(verseId);
    setIsSpeaking(true);
    setIsPaused(false);
    Speech.speak(text, {
      language,
      pitch: 1.0,
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
