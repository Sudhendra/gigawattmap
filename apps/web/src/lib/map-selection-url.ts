/** Update client-only map state without route navigation or stale query snapshots. */
export function replaceMapSelection(key: 'dc' | 'operator', value: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const before = url.href;
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  if (key === 'operator' && value) url.searchParams.delete('dc');
  if (url.href === before) return;
  // Next integrates native history updates with useSearchParams. No RSC fetch.
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}
