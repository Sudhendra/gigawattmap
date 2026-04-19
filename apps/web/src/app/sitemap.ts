import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/env';
import { buildSitemapEntries } from './sitemap-entries';

/**
 * App Router sitemap route. Logic lives in `sitemap-entries.ts` so vitest can
 * cover it without a JSX runtime (apps/web vitest config — see AGENTS.md).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(APP_URL);
}
