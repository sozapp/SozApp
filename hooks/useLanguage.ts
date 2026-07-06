import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import type { Language, TranslationKey } from '@/constants/i18n';
import { translations } from '@/constants/i18n';

const STORAGE_KEY = '@soz/language';
const VALID_LANGUAGES: Language[] = ['tr', 'en', 'de', 'ku', 'hy', 'el', 'ar'];

const RTL_LANGUAGES: Language[] = ['ar'];

export function useLanguage() {
  const [language, setLanguage] = useState<Language>('tr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((lang) => {
        if (lang && VALID_LANGUAGES.includes(lang as Language)) {
          const validLang = lang as Language;
          setLanguage(validLang);
          // RTL kontrolü uygulama açılışında
          const shouldBeRTL = RTL_LANGUAGES.includes(validLang);
          if (I18nManager.isRTL !== shouldBeRTL) {
            I18nManager.forceRTL(shouldBeRTL);
          }
        }
      })
      .catch(() => {});
  }, []);

  const changeLanguage = useCallback(async (lang: Language) => {
    try {
      setLanguage(lang);
      await AsyncStorage.setItem(STORAGE_KEY, lang);

      // Arapça RTL, diğerleri LTR
      const shouldBeRTL = RTL_LANGUAGES.includes(lang);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        // RTL değişikliği için uygulamayı yeniden başlatma gerekebilir
        // Kullanıcıya bildirim göstermek için bu değeri döndürebilirsiniz
      }
    } catch (e) {
      console.log('Language save error:', e);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const langMap = translations[language] ?? translations.tr;
      let text: string =
        (langMap as Record<string, string>)[key] ??
        (translations.tr as Record<string, string>)[key] ??
        String(key);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.split(`{${k}}`).join(String(v));
        });
      }
      return text;
    },
    [language]
  );

  return { language, changeLanguage, t };
}
