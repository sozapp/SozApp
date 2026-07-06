import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { useCallback, useState } from 'react';

const STORAGE_SPEECH_RATE = '@soz/speechRate';
const DEFAULT_RATE = 0.85;
const IOS_MALE_VOICE = 'com.apple.ttsbundle.Türkçe_Cem-compact';
const FALLBACK_RATE = 0.82;
const FALLBACK_PITCH = 0.85;

async function getStoredRate(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_SPEECH_RATE);
    if (raw == null) return DEFAULT_RATE;
    const n = parseFloat(raw);
    if (Number.isNaN(n) || n < 0.5 || n > 2) return DEFAULT_RATE;
    return n;
  } catch {
    return DEFAULT_RATE;
  }
}

async function getSpeechOptions() {
  const rate = await getStoredRate();
  if (Platform.OS === 'ios') {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const trVoices = voices.filter((v) => v.language === 'tr-TR' || v.language?.startsWith('tr'));
      const hasCem = trVoices.some(
        (v) => (v as { identifier?: string }).identifier?.includes('Cem') ?? false
      );
      if (hasCem) {
        return { language: 'tr-TR' as const, rate, pitch: 1.0, voice: IOS_MALE_VOICE };
      }
    } catch (_) {}
  }
  return { language: 'tr-TR' as const, rate: FALLBACK_RATE, pitch: FALLBACK_PITCH };
}

export async function getAvailableVoices() {
  const voices = await Speech.getAvailableVoicesAsync();
  return voices.filter((v) => v.language === 'tr-TR' || v.language?.startsWith('tr'));
}

export type VerseForSpeech = { text: string };

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentVerseId, setCurrentVerseId] = useState<string | null>(null);

  const speak = useCallback(async (text: string, verseId: string) => {
    await Speech.stop();
    setCurrentVerseId(verseId);
    setIsSpeaking(true);
    setIsPaused(false);
    Speech.speak(text, {
      language: 'tr-TR',
      rate: 0.8,
      pitch: 0.75,
      onDone: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
      onStopped: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
    });
  }, []);

  const speakChapter = useCallback(async (verses: VerseForSpeech[]) => {
    const fullText = verses.map((v) => v.text).join(' ');
    await Speech.stop();
    setIsSpeaking(true);
    setCurrentVerseId('chapter');
    Speech.speak(fullText, {
      language: 'tr-TR',
      rate: 0.8,
      pitch: 0.75,
      onDone: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
      onStopped: () => {
        setIsSpeaking(false);
        setCurrentVerseId(null);
      },
    });
  }, []);

  const stop = useCallback(async () => {
    await Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentVerseId(null);
  }, []);

  return { isSpeaking, isPaused, currentVerseId, speak, speakChapter, stop };
}
