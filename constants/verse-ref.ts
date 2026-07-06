/** "Yuhanna 3:16" → read ekranı router params */
export function parseRef(ref: string): { book: string; chapter: string; highlightVerse: string } | null {
  const match = ref.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return {
    book: match[1].trim(),
    chapter: match[2],
    highlightVerse: match[3],
  };
}
