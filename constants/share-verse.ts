import {
  getBookIdByBookName,
  parseVerseIdComponents,
} from '@/constants/bible-index';

export type VerseDeepLinkParams = {
  bookId: string;
  chapter: number | string;
  verse: number | string;
};

/**
 * Universal link (https://sozapp.com/read?...) — AASA (iOS) ve Play App Links
 * (Android) ile yapılandırılmış (bkz. soz-website/.well-known/, app.config.js
 * associatedDomains/intentFilters). Uygulama yüklüyse doğrudan açılır;
 * yüklü değilse sozapp.com/read sayfasındaki mağaza linklerine düşer —
 * bu yüzden ham "soz://" şemasından daha güvenilir bir paylaşım linki.
 */
export function buildVerseDeepLink(params: VerseDeepLinkParams): string {
  const q = new URLSearchParams({
    bookId: String(params.bookId),
    chapter: String(params.chapter),
    verse: String(params.verse),
  });
  return `https://sozapp.com/read?${q.toString()}`;
}

export function resolveBookIdForShare(bookName: string): string | null {
  const n = bookName.trim();
  if (!n) return null;
  const lower = n.toLowerCase();
  if (lower === 'mezmurlar' || lower === 'mezmur' || lower === 'mez') return 'psalms';
  return getBookIdByBookName(n);
}

/** "Yuhanna-3-16" / "Mezmurlar-23-1" → deep link paramları */
export function deepLinkParamsFromVerseId(verseId: string): VerseDeepLinkParams | null {
  const p = parseVerseIdComponents(verseId);
  if (!p) return null;
  const bookId = resolveBookIdForShare(p.book);
  if (!bookId) return null;
  return { bookId, chapter: p.chapter, verse: p.verse };
}

export type BuildShareMessageOptions = {
  /** Not paylaşımında ek satır */
  note?: string;
  /** Varsayılan: Söz Uygulaması • sozapp.com */
  brandLine?: string;
};

/**
 * Paylaşılan metin: ayet + referans + marka + (varsa) soz:// deep link.
 */
export function buildShareMessage(
  verseText: string,
  verseRef: string,
  deepLinkParams?: VerseDeepLinkParams | null,
  options?: BuildShareMessageOptions
): string {
  const brand = options?.brandLine ?? 'Söz Uygulaması • sozapp.com';
  let message = `«${verseText}»\n— ${verseRef}`;
  if (options?.note?.trim()) {
    message += `\n\nNot: ${options.note.trim()}`;
  }
  message += `\n\n${brand}`;
  if (deepLinkParams?.bookId) {
    message += `\n${buildVerseDeepLink(deepLinkParams)}`;
  }
  return message;
}
