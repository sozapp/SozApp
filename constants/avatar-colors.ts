/** Kullanıcı avatarları için deterministik renk paleti (id → sabit renk). */
const PALETTE = [
  '#C4956A',
  '#7C9A8A',
  '#9A7C8A',
  '#6BA3BE',
  '#BE6B7C',
  '#8A9A7C',
  '#D4A843',
  '#8A8A9A',
] as const;

/**
 * Aynı userId her zaman aynı rengi alır; farklı kullanıcılar dağılım gösterir.
 * Kendi avatarın için de daima auth user id kullan (email değil).
 */
export function colorForUserId(userId: string): string {
  if (!userId) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
