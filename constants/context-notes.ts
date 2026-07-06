import type { ContextNote } from './context-note-types';
import { contextNotesLegacy } from './context-notes-legacy';
import { contextNotesMarkLuke } from './context-notes-nt-mark-luke';
import { contextNotesPhpJud } from './context-notes-nt-php-jud';
import { contextNotesRevelation } from './context-notes-nt-revelation';
import { contextNotesRomEph } from './context-notes-nt-rom-eph';

export type { ContextNote } from './context-note-types';

/**
 * Bağlam notları: Matta/Yuhanna/Elçiler (kısmi) + istenen tüm Yeni Ahit mektupları ve Markos/Luka/Vahiy tam bölüm.
 */
export const contextNotes: ContextNote[] = [
  ...contextNotesLegacy,
  ...contextNotesMarkLuke,
  ...contextNotesRomEph,
  ...contextNotesPhpJud,
  ...contextNotesRevelation,
];

export function getContextNote(bookId: string, chapter: number): ContextNote | undefined {
  return contextNotes.find((n) => n.bookId === bookId && n.chapter === chapter);
}
