import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts as appFonts } from '@/constants/theme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = '@soz/readingTheme';

export type ThemeType = 'day' | 'night' | 'sepia' | 'black';

/** Marka vurgusu için dosya başında `const ACCENT = '#C4956A'` kullanın — theme’de yok. */
export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  /** Kart / chip zeminleri (koyu temada ~#1A1A17) */
  card: string;
  text: string;
  textMuted: string;
  /** Bölüm alt başlıkları vb. */
  textSecondary: string;
  textFaint: string;
  border: string;
  borderStrong: string;
};

export const themes: Record<ThemeType, ThemeColors> = {
  day: {
    background: '#F5F0E8',
    surface: '#EDE8DF',
    surfaceAlt: '#E5DFD5',
    card: '#E8E4DC',
    text: '#2C2C2C',
    textMuted: 'rgba(44,44,44,0.55)',
    textSecondary: 'rgba(44,44,44,0.45)',
    textFaint: 'rgba(44,44,44,0.3)',
    border: 'rgba(196,149,80,0.2)',
    borderStrong: 'rgba(196,149,80,0.4)',
  },
  night: {
    background: '#0A0A08',
    surface: '#1A1612',
    surfaceAlt: '#221E19',
    card: '#1A1A17',
    text: '#E8E0D0',
    textMuted: 'rgba(232,224,208,0.55)',
    textSecondary: 'rgba(232,224,208,0.45)',
    textFaint: 'rgba(232,224,208,0.3)',
    border: 'rgba(196,149,80,0.15)',
    borderStrong: 'rgba(196,149,80,0.35)',
  },
  sepia: {
    background: '#F2E8D9',
    surface: '#EAE0CF',
    surfaceAlt: '#E0D5C2',
    card: '#E5DAC8',
    text: '#3C2415',
    textMuted: 'rgba(60,36,21,0.55)',
    textSecondary: 'rgba(60,36,21,0.45)',
    textFaint: 'rgba(60,36,21,0.3)',
    border: 'rgba(196,149,80,0.25)',
    borderStrong: 'rgba(196,149,80,0.45)',
  },
  black: {
    background: '#000000',
    surface: '#111111',
    surfaceAlt: '#1A1A1A',
    card: '#141414',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.55)',
    textSecondary: 'rgba(255,255,255,0.45)',
    textFaint: 'rgba(255,255,255,0.3)',
    border: 'rgba(196,149,80,0.15)',
    borderStrong: 'rgba(196,149,80,0.35)',
  },
};

export const themeNames: Record<ThemeType, string> = {
  day: 'Gündüz',
  night: 'Gece',
  sepia: 'Sepia',
  black: 'Siyah',
};

type ThemeContextValue = {
  colors: ThemeColors;
  fonts: typeof appFonts;
  activeTheme: ThemeType;
  changeTheme: (theme: ThemeType) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  theme: ThemeColors;
  themeName: ThemeType;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [activeTheme, setActiveTheme] = useState<ThemeType>('night');

  const loadFromStorage = useCallback(async () => {
    try {
      const t = await AsyncStorage.getItem(STORAGE_KEY);
      if (t && (t === 'day' || t === 'night' || t === 'sepia' || t === 'black')) {
        setActiveTheme(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const changeTheme = useCallback(async (theme: ThemeType) => {
    setActiveTheme(theme);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, []);

  const colors = themes[activeTheme];

  return (
    <ThemeContext.Provider
      value={{
        colors,
        fonts: appFonts,
        activeTheme,
        changeTheme,
        loadFromStorage,
        theme: colors,
        themeName: activeTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
