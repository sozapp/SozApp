/** Tek ücretsiz okuma planı (Premium olmayanlar). */
export const FREE_PLAN_ID = 'yeni-ahit-30';

/** Söz'e Sor günlük ücretsiz soru limiti. */
export const FREE_AI_QUESTIONS_PER_DAY = 10;

export const PREMIUM_FEATURES = {
  multipleTranslations: 'multipleTranslations',
  readingPlans: 'readingPlans',
  unlimitedNotes: 'unlimitedNotes',
  shareCardThemes: 'shareCardThemes',
  offlineAccess: 'offlineAccess',
} as const;

export const FREE_LIMITS = {
  notesLimit: 5,
  highlightsLimit: 10,
} as const;
