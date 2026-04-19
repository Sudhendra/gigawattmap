/**
 * Pure URL builders for the share modal. Logic lives in a sibling `.ts`
 * file (no JSX) so vitest can unit-test it directly without a JSX runtime
 * — same pattern used by other testable logic in apps/web (intelligence-
 * card-helpers, ticker-map, etc.).
 */

export type CampusForShare = {
  id: string;
  name: string;
  operator: string;
  country: string;
  est_mw_mid: number | null | undefined;
};

/**
 * Editorial template for share-to-Twitter / share-to-LinkedIn copy. Single
 * source of truth — both the OG-image consumer and the intent URLs use it.
 */
export function buildShareCopy(c: CampusForShare): string {
  const parts = [c.operator];
  if (typeof c.est_mw_mid === 'number' && Number.isFinite(c.est_mw_mid)) {
    const mw = Math.round(c.est_mw_mid).toLocaleString('en-US');
    parts.push(`~${mw} MW`);
  }
  parts.push(c.country);
  return `Just discovered ${c.name} on @gigawattmap — ${parts.join(' · ')}`;
}

/**
 * Twitter web-intent URL. Twitter does its own URL unfurl — passing both
 * `text` and `url` is the documented pattern (the URL becomes a separate
 * card, not part of the tweet body's character count when shared from web).
 */
export function buildTweetIntent(c: CampusForShare, shareUrl: string): string {
  const u = new URL('https://twitter.com/intent/tweet');
  u.searchParams.set('text', buildShareCopy(c));
  u.searchParams.set('url', shareUrl);
  return u.toString();
}

/**
 * LinkedIn share-offsite URL. LinkedIn relies entirely on the og:image /
 * og:title / og:description meta of the shared URL — the editorial copy
 * itself is not passed in the intent.
 */
export function buildLinkedInIntent(shareUrl: string): string {
  const u = new URL('https://www.linkedin.com/sharing/share-offsite/');
  u.searchParams.set('url', shareUrl);
  return u.toString();
}

/**
 * Resolve the OG image URL for a given dc id.
 *
 * In production `apiBase` is empty so requests stay same-origin (the
 * Cloudflare worker handles `/api/*` directly). In local dev `apiBase`
 * is the wrangler dev origin so the Next dev server can reach the worker.
 */
export function buildOgImageUrl(id: string, apiBase: string): string {
  const base = apiBase.replace(/\/+$/, '');
  return `${base}/api/v1/og?dc=${encodeURIComponent(id)}`;
}
