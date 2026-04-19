import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Not found — Gigawatt Map',
  description:
    'The page you were looking for does not exist on Gigawatt Map.',
};

/**
 * App Router 404 handler. Server Component; no client JS needed.
 *
 * AppHeader is rendered globally in `layout.tsx`, so we only render the body
 * here (see `app/__tests__/header-singleton.test.ts` — re-rendering it would
 * regress to a duplicate sticky bar).
 */
export default function NotFound(): React.JSX.Element {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-screen-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-text-subtle">
        404 — off the map
      </p>
      <h1 className="font-serif text-4xl text-text-primary md:text-5xl">
        This coordinate isn&rsquo;t on the grid.
      </h1>
      <p className="max-w-prose text-base text-text-muted">
        The page you tried to reach doesn&rsquo;t exist. It may have been
        renamed, removed, or you may have followed a stale share link from
        before a data refresh.
      </p>
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-accent-cable transition-opacity hover:opacity-80"
      >
        ← Back to the map
      </Link>
    </div>
  );
}
