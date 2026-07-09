/**
 * Formatta il conteggio foto per badge UI (es. navigazione).
 * Se ci sono altre foto non ancora caricate, aggiunge "+".
 */
export function formatPhotoBadge(
  loadedCount: number,
  hasMore: boolean
): string {
  if (loadedCount <= 0) return "";
  if (hasMore) return `${loadedCount}+`;
  return String(loadedCount);
}
