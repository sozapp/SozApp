import type { TranslationKey } from '@/constants/i18n';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type ReadingPlan = {
  id: string;
  /** Friend activity / fallback — Türkçe kalır */
  title: string;
  description: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ComponentProps<typeof Ionicons>['name'];
  totalDays: number;
  days: {
    day: number;
    reference: string;
    bookShort: string;
    chapter: number;
  }[];
};

export const plans: ReadingPlan[] = [
  {
    id: 'yeni-ahit-30',
    title: 'Yeni Ahit 30 Günde',
    description: "Yeni Ahit'i 30 günde tamamla",
    titleKey: 'planTitleYeniAhit30',
    descriptionKey: 'planDescYeniAhit30',
    icon: 'book-outline',
    totalDays: 30,
    days: [
      { day: 1, reference: 'Matta 1-2', bookShort: 'Mat', chapter: 1 },
      { day: 2, reference: 'Matta 3-4', bookShort: 'Mat', chapter: 3 },
      { day: 3, reference: 'Matta 5-7', bookShort: 'Mat', chapter: 5 },
      { day: 4, reference: 'Matta 8-9', bookShort: 'Mat', chapter: 8 },
      { day: 5, reference: 'Matta 10-11', bookShort: 'Mat', chapter: 10 },
      { day: 6, reference: 'Matta 12-13', bookShort: 'Mat', chapter: 12 },
      { day: 7, reference: 'Matta 14-15', bookShort: 'Mat', chapter: 14 },
      { day: 8, reference: 'Matta 16-18', bookShort: 'Mat', chapter: 16 },
      { day: 9, reference: 'Matta 19-20', bookShort: 'Mat', chapter: 19 },
      { day: 10, reference: 'Matta 21-22', bookShort: 'Mat', chapter: 21 },
      { day: 11, reference: 'Matta 23-24', bookShort: 'Mat', chapter: 23 },
      { day: 12, reference: 'Matta 25-26', bookShort: 'Mat', chapter: 25 },
      { day: 13, reference: 'Matta 27-28', bookShort: 'Mat', chapter: 27 },
      { day: 14, reference: 'Markos 1-3', bookShort: 'Mar', chapter: 1 },
      { day: 15, reference: 'Markos 4-5', bookShort: 'Mar', chapter: 4 },
      { day: 16, reference: 'Markos 6-8', bookShort: 'Mar', chapter: 6 },
      { day: 17, reference: 'Markos 9-10', bookShort: 'Mar', chapter: 9 },
      { day: 18, reference: 'Markos 11-13', bookShort: 'Mar', chapter: 11 },
      { day: 19, reference: 'Markos 14-16', bookShort: 'Mar', chapter: 14 },
      { day: 20, reference: 'Luka 1-2', bookShort: 'Luk', chapter: 1 },
      { day: 21, reference: 'Luka 3-4', bookShort: 'Luk', chapter: 3 },
      { day: 22, reference: 'Luka 5-6', bookShort: 'Luk', chapter: 5 },
      { day: 23, reference: 'Luka 7-8', bookShort: 'Luk', chapter: 7 },
      { day: 24, reference: 'Luka 9-10', bookShort: 'Luk', chapter: 9 },
      { day: 25, reference: 'Luka 11-13', bookShort: 'Luk', chapter: 11 },
      { day: 26, reference: 'Luka 14-16', bookShort: 'Luk', chapter: 14 },
      { day: 27, reference: 'Luka 17-18', bookShort: 'Luk', chapter: 17 },
      { day: 28, reference: 'Luka 19-20', bookShort: 'Luk', chapter: 19 },
      { day: 29, reference: 'Luka 21-22', bookShort: 'Luk', chapter: 21 },
      { day: 30, reference: 'Yuhanna 1-3', bookShort: 'Yuh', chapter: 1 },
    ],
  },
  {
    id: 'yuhanna-10',
    title: 'Yuhanna İncili 10 Günde',
    description: 'Yuhanna’yı 10 günde oku — yeni başlayanlar için',
    titleKey: 'planTitleYuhanna10',
    descriptionKey: 'planDescYuhanna10',
    icon: 'sunny-outline',
    totalDays: 10,
    // Yuhanna: 21 bölüm
    days: [
      { day: 1, reference: 'Yuhanna 1-2', bookShort: 'Yuh', chapter: 1 },
      { day: 2, reference: 'Yuhanna 3-4', bookShort: 'Yuh', chapter: 3 },
      { day: 3, reference: 'Yuhanna 5-6', bookShort: 'Yuh', chapter: 5 },
      { day: 4, reference: 'Yuhanna 7-8', bookShort: 'Yuh', chapter: 7 },
      { day: 5, reference: 'Yuhanna 9-10', bookShort: 'Yuh', chapter: 9 },
      { day: 6, reference: 'Yuhanna 11-12', bookShort: 'Yuh', chapter: 11 },
      { day: 7, reference: 'Yuhanna 13-14', bookShort: 'Yuh', chapter: 13 },
      { day: 8, reference: 'Yuhanna 15-16', bookShort: 'Yuh', chapter: 15 },
      { day: 9, reference: 'Yuhanna 17-18', bookShort: 'Yuh', chapter: 17 },
      { day: 10, reference: 'Yuhanna 19-21', bookShort: 'Yuh', chapter: 19 },
    ],
  },
  {
    id: 'pavlus-21',
    title: "Pavlus'un Mektupları 21 Günde",
    description: 'Romalılar’dan Filimon’a Pavlus’un mektupları',
    titleKey: 'planTitlePavlus21',
    descriptionKey: 'planDescPavlus21',
    icon: 'mail-outline',
    totalDays: 21,
    // Rom 1–6 mevcut; 7–16 henüz yok. Sonrası tam: 1Ko…Flm
    days: [
      { day: 1, reference: 'Romalılar 1-3', bookShort: 'Rom', chapter: 1 },
      { day: 2, reference: 'Romalılar 4-6', bookShort: 'Rom', chapter: 4 },
      { day: 3, reference: '1. Korintliler 1-4', bookShort: '1Ko', chapter: 1 },
      { day: 4, reference: '1. Korintliler 5-8', bookShort: '1Ko', chapter: 5 },
      { day: 5, reference: '1. Korintliler 9-12', bookShort: '1Ko', chapter: 9 },
      { day: 6, reference: '1. Korintliler 13-16', bookShort: '1Ko', chapter: 13 },
      { day: 7, reference: '2. Korintliler 1-4', bookShort: '2Ko', chapter: 1 },
      { day: 8, reference: '2. Korintliler 5-8', bookShort: '2Ko', chapter: 5 },
      { day: 9, reference: '2. Korintliler 9-13', bookShort: '2Ko', chapter: 9 },
      { day: 10, reference: 'Galatyalılar 1-3', bookShort: 'Gal', chapter: 1 },
      { day: 11, reference: 'Galatyalılar 4-6', bookShort: 'Gal', chapter: 4 },
      { day: 12, reference: 'Efesliler 1-3', bookShort: 'Ef', chapter: 1 },
      { day: 13, reference: 'Efesliler 4-6', bookShort: 'Ef', chapter: 4 },
      { day: 14, reference: 'Filipililer 1-4', bookShort: 'Flp', chapter: 1 },
      { day: 15, reference: 'Koloseliler 1-4', bookShort: 'Kol', chapter: 1 },
      { day: 16, reference: '1. Selanikliler 1-5', bookShort: '1Se', chapter: 1 },
      { day: 17, reference: '2. Selanikliler 1-3', bookShort: '2Se', chapter: 1 },
      { day: 18, reference: '1. Timoteos 1-3', bookShort: '1Ti', chapter: 1 },
      { day: 19, reference: '1. Timoteos 4-6', bookShort: '1Ti', chapter: 4 },
      { day: 20, reference: '2. Timoteos 1-4', bookShort: '2Ti', chapter: 1 },
      { day: 21, reference: 'Titus–Filimon', bookShort: 'Tit', chapter: 1 },
    ],
  },
  {
    id: 'vaazlar-14',
    title: 'Vaazlar ve Meseller 14 Günde',
    description: 'Matta’daki Dağdaki Vaaz ve meseller',
    titleKey: 'planTitleVaazlar14',
    descriptionKey: 'planDescVaazlar14',
    icon: 'chatbubbles-outline',
    totalDays: 14,
    // Matta 28 bölüm; Dağdaki Vaaz (5–7) + mesel ağırlıklı bölümler
    days: [
      { day: 1, reference: 'Matta 5', bookShort: 'Mat', chapter: 5 },
      { day: 2, reference: 'Matta 6', bookShort: 'Mat', chapter: 6 },
      { day: 3, reference: 'Matta 7', bookShort: 'Mat', chapter: 7 },
      { day: 4, reference: 'Matta 13', bookShort: 'Mat', chapter: 13 },
      { day: 5, reference: 'Matta 18', bookShort: 'Mat', chapter: 18 },
      { day: 6, reference: 'Matta 20', bookShort: 'Mat', chapter: 20 },
      { day: 7, reference: 'Matta 21', bookShort: 'Mat', chapter: 21 },
      { day: 8, reference: 'Matta 22', bookShort: 'Mat', chapter: 22 },
      { day: 9, reference: 'Matta 24', bookShort: 'Mat', chapter: 24 },
      { day: 10, reference: 'Matta 25', bookShort: 'Mat', chapter: 25 },
      { day: 11, reference: 'Matta 8', bookShort: 'Mat', chapter: 8 },
      { day: 12, reference: 'Matta 9', bookShort: 'Mat', chapter: 9 },
      { day: 13, reference: 'Matta 10', bookShort: 'Mat', chapter: 10 },
      { day: 14, reference: 'Matta 11', bookShort: 'Mat', chapter: 11 },
    ],
  },
  {
    id: 'markos-8',
    title: 'Markos İncili 8 Günde',
    description: 'En kısa İncil’i 8 günde tamamla',
    titleKey: 'planTitleMarkos8',
    descriptionKey: 'planDescMarkos8',
    icon: 'flash-outline',
    totalDays: 8,
    // Markos: 16 bölüm
    days: [
      { day: 1, reference: 'Markos 1-2', bookShort: 'Mar', chapter: 1 },
      { day: 2, reference: 'Markos 3-4', bookShort: 'Mar', chapter: 3 },
      { day: 3, reference: 'Markos 5-6', bookShort: 'Mar', chapter: 5 },
      { day: 4, reference: 'Markos 7-8', bookShort: 'Mar', chapter: 7 },
      { day: 5, reference: 'Markos 9-10', bookShort: 'Mar', chapter: 9 },
      { day: 6, reference: 'Markos 11-12', bookShort: 'Mar', chapter: 11 },
      { day: 7, reference: 'Markos 13-14', bookShort: 'Mar', chapter: 13 },
      { day: 8, reference: 'Markos 15-16', bookShort: 'Mar', chapter: 15 },
    ],
  },
];
