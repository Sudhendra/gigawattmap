/**
 * Pure helper for the App Router sitemap. Lives next to the route module so
 * vitest can cover the entry list without loading a JSX runtime (apps/web's
 * vitest config does not). The sitemap.ts route file is a thin adapter that
 * just calls `buildSitemapEntries(APP_URL)`.
 *
 * One entry per indexable public route. We intentionally OMIT routes that
 * are app-shell only (e.g. dynamic dc deep-links, /news subpages) until we
 * generate them from the canonical artifact in a later pass.
 */
import type { MetadataRoute } from 'next';

const ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}> = [
  { path: '/', changeFrequency: 'daily', priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/data', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/data/api', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/news', changeFrequency: 'daily', priority: 0.8 },
];

/**
 * Build the sitemap entry list. `appUrl` must be an absolute origin with no
 * trailing slash (e.g. `'https://gigawattmap.com'`); pass `now` in tests so
 * `lastModified` is deterministic.
 */
export function buildSitemapEntries(
  appUrl: string,
  now: Date = new Date(),
): MetadataRoute.Sitemap {
  if (appUrl.endsWith('/')) {
    throw new Error(`appUrl must not end with '/': got ${appUrl}`);
  }
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${appUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
