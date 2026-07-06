export type HighlightColorId = 'amber' | 'sage' | 'rose' | 'sky';

export const HIGHLIGHT_COLORS: Array<{
  id: HighlightColorId;
  background: string;
  border: string;
  label: string;
}> = [
  {
    id: 'amber',
    background: 'rgba(196,149,80,0.18)',
    border: 'rgba(196,149,80,0.4)',
    label: 'Kehribar',
  },
  {
    id: 'sage',
    background: 'rgba(120,160,120,0.18)',
    border: 'rgba(120,160,120,0.4)',
    label: 'Adaçayı',
  },
  {
    id: 'rose',
    background: 'rgba(180,100,100,0.15)',
    border: 'rgba(180,100,100,0.35)',
    label: 'Gül',
  },
  {
    id: 'sky',
    background: 'rgba(80,130,180,0.18)',
    border: 'rgba(80,130,180,0.4)',
    label: 'Gökyüzü',
  },
];

/**
 * Resolves stored value (color id or legacy hex) to palette entry.
 * Keeps backward compatibility with old hex values.
 */
export function getHighlightPaletteEntry(stored: string): (typeof HIGHLIGHT_COLORS)[number] {
  const byId = HIGHLIGHT_COLORS.find((c) => c.id === stored);
  if (byId) return byId;
  return HIGHLIGHT_COLORS[0];
}
