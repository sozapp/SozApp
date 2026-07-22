import { useSpeechInternal } from '@/hooks/useSpeech';
import { createContext, useContext, type ReactNode } from 'react';

const SpeechContext = createContext<ReturnType<typeof useSpeechInternal> | null>(null);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const value = useSpeechInternal();
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) {
    throw new Error('useSpeech must be used within SpeechProvider');
  }
  return ctx;
}
