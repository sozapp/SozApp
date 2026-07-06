import { useAmbientMusicInternal } from '@/hooks/useAmbientMusic';
import { createContext, useContext, type ReactNode } from 'react';

const AmbientMusicContext = createContext<ReturnType<typeof useAmbientMusicInternal> | null>(null);

export function AmbientMusicProvider({ children }: { children: ReactNode }) {
  const value = useAmbientMusicInternal();
  return <AmbientMusicContext.Provider value={value}>{children}</AmbientMusicContext.Provider>;
}

export function useAmbientMusic() {
  const ctx = useContext(AmbientMusicContext);
  if (!ctx) {
    throw new Error('useAmbientMusic must be used within AmbientMusicProvider');
  }
  return ctx;
}
