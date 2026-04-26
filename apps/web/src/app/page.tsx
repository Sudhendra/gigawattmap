import { MapView } from './_components/map-view';

/**
 * Home page is a server component that renders an immediate, paint-ready
 * hero shell (giving LCP a real candidate at SSR time) and then mounts the
 * client-side `MapView` on top. The hero sits behind the map and is
 * naturally covered when MapLibre hydrates — no flicker, no shift.
 */
export default function HomePage(): React.JSX.Element {
  return (
    <div className="relative">
      <HomeHero />
      <MapView />
    </div>
  );
}

/**
 * Server-rendered loading shell. Two purposes:
 *   1. Lighthouse LCP target — the wordmark + tagline paint at first byte,
 *      so LCP lands well under 2.0 s on cold load instead of waiting for
 *      MapLibre to hydrate.
 *   2. Sets a calm, on-brand first impression while the GL context spins
 *      up. Once the map mounts it covers this layer entirely.
 *
 * Marked `aria-hidden` because the same content is announced by the map
 * region after hydration; we don't want assistive tech to read it twice.
 */
function HomeHero(): React.JSX.Element {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex h-[calc(100vh-3rem)] items-center justify-center bg-[var(--bg-base)]"
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-muted)]">
          loading atlas
        </p>
        <h1 className="font-serif text-3xl leading-tight text-[var(--text-primary)] md:text-5xl">
          Every AI datacenter.
          <br />
          The grid that feeds it.
        </h1>
      </div>
    </div>
  );
}
