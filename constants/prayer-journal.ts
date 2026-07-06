export const STORAGE_PRAYERS = '@soz/prayers';

export type PrayerEntry = {
  id: string;
  title?: string;
  text: string;
  answered: boolean;
  createdAt: string;
  answeredAt?: string;
};

export function createPrayerId(): string {
  return `prayer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
