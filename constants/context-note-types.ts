export type ContextNote = {
  bookId: string;
  chapter: number;
  title: string;
  summary: string;
  historicalContext: string;
  /** TKI 2001 ayet konumu */
  keyVerse: string;
  /** Anahtar ayet metni (TKI 2001) */
  keyQuote?: string;
};
