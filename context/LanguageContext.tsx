import { createContext, useContext, type ReactNode } from 'react';
import type { Language, TranslationKey } from '@/constants/i18n';
import { useLanguage } from '@/hooks/useLanguage';

type LanguageContextType = {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const languageData = useLanguage();
  return (
    <LanguageContext.Provider value={languageData}>{children}</LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback — context yoksa Türkçe döndür (test cihazında provider dışında render olabilir)
    return {
      language: 'tr' as const,
      changeLanguage: () => {},
      t: ((key: TranslationKey) => key) as LanguageContextType['t'],
    };
  }
  return context;
}
