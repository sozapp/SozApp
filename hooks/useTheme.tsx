import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts as appFonts } from '@/constants/theme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

const STORAGE_KEY = '@soz/readingTheme';

/** Elle seçilebilen paletler (sepia/black özel kalır). */
export type ThemePaletteId = 'day' | 'night' | 'sepia' | 'black';
/** Kullanıcı tercihi — `system` cihazın açık/koyu modunu izler. */
export type ThemeType = ThemePaletteId | 'system';

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

export const themes: Record<ThemePaletteId, ThemeColors> = {
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
  system: 'Otomatik (Sistem)',
  day: 'Gündüz',
  night: 'Gece',
  sepia: 'Sepia',
  black: 'Siyah',
};

const THEME_TYPES: readonly ThemeType[] = ['system', 'day', 'night', 'sepia', 'black'];

function isThemeType(value: string): value is ThemeType {
  return (THEME_TYPES as readonly string[]).includes(value);
}

function resolvePalette(
  preference: ThemeType,
  systemScheme: string | null | undefined
): ThemePaletteId {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'night' : 'day';
  }
  return preference;
}

type ThemeContextValue = {
  colors: ThemeColors;
  fonts: typeof appFonts;
  /** Kullanıcının seçtiği tercih (`system` dahil). */
  activeTheme: ThemeType;
  /** Uygulanan palet — `system` iken day/night. */
  resolvedTheme: ThemePaletteId;
  changeTheme: (theme: ThemeType) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  theme: ThemeColors;
  /** @deprecated resolvedTheme kullanın; geriye dönük alias. */
  themeName: ThemeType;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState<ThemeType>('system');

  const loadFromStorage = useCallback(async () => {
    try {
      const t = await AsyncStorage.getItem(STORAGE_KEY);
      if (t && isThemeType(t)) {
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

  const resolvedTheme = useMemo(
    () => resolvePalette(activeTheme, systemScheme),
    [activeTheme, systemScheme]
  );

  const colors = themes[resolvedTheme];

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      fonts: appFonts,
      activeTheme,
      resolvedTheme,
      changeTheme,
      loadFromStorage,
      theme: colors,
      themeName: activeTheme,
    }),
    [colors, activeTheme, resolvedTheme, changeTheme, loadFromStorage]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
