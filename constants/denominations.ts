export type Denomination =
  | 'orthodox'
  | 'catholic'
  | 'protestant'
  | 'armenian'
  | 'syriac'
  | 'other';

/** Ionicons icon name for each denomination */
export type DenominationIconName =
  | 'triangle-outline'
  | 'add-outline'
  | 'sunny-outline'
  | 'diamond-outline'
  | 'star-outline'
  | 'ellipse-outline';

export const denominations = [
  {
    id: 'orthodox' as const,
    name: 'Ortodoks',
    nameEn: 'Orthodox',
    icon: 'triangle-outline' as DenominationIconName,
    description: 'Ekümenik Patrikane ve Ortodoks kiliseleri',
    calendar: 'julian',
    color: '#8B6914',
  },
  {
    id: 'catholic' as const,
    name: 'Katolik',
    nameEn: 'Catholic',
    icon: 'add-outline' as DenominationIconName,
    description: 'Roma Katolik Kilisesi',
    calendar: 'gregorian',
    color: '#1a3a6b',
  },
  {
    id: 'protestant' as const,
    name: 'Protestan',
    nameEn: 'Protestant',
    icon: 'sunny-outline' as DenominationIconName,
    description: 'Protestan ve Evanjelik kiliseler',
    calendar: 'gregorian',
    color: '#2d5a27',
  },
  {
    id: 'armenian' as const,
    name: 'Ermeni Apostolik',
    nameEn: 'Armenian Apostolic',
    icon: 'diamond-outline' as DenominationIconName,
    description: 'Ermeni Apostolik Kilisesi',
    calendar: 'armenian',
    color: '#8B1a1a',
  },
  {
    id: 'syriac' as const,
    name: 'Süryani Ortodoks',
    nameEn: 'Syriac Orthodox',
    icon: 'star-outline' as DenominationIconName,
    description: 'Süryani Ortodoks Kilisesi',
    calendar: 'gregorian',
    color: '#4a1a6b',
  },
  {
    id: 'other' as const,
    name: 'Diğer / Belirtmek istemiyorum',
    nameEn: 'Other',
    icon: 'ellipse-outline' as DenominationIconName,
    description: 'Tüm içerikler gösterilir',
    calendar: 'gregorian',
    color: '#C4956A',
  },
];
