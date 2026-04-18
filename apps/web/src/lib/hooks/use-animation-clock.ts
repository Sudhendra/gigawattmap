'use client';

import { useEffect, useState } from 'react';

/**
 * Returns ``true`` when the user has the OS-level ``prefers-reduced-motion``
 * preference set. SSR-safe: returns ``false`` on the server (and the first
 * client render) and updates on mount + when the preference changes.
 *
 * Centralized here so any layer can opt out of animation without having to
 * re-derive matchMedia + listener boilerplate.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
    // Older Safari needs addListener; modern browsers prefer addEventListener.
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);
  return reduced;
}

/**
 * Returns a monotonically-increasing wallclock in milliseconds, ticking via
 * ``requestAnimationFrame``. Returns ``null`` when ``enabled`` is ``false``
 * so callers can disable animation entirely (e.g. when the user prefers
 * reduced motion) without conditionally calling hooks.
 *
 * The returned value triggers a React re-render every frame, so consumers
 * should pass it directly into a deck.gl layer's animated prop and avoid
 * deriving expensive memos from it.
 */
export function useAnimationClock(enabled: boolean): number | null {
  const [t, setT] = useState<number | null>(enabled ? 0 : null);
  useEffect(() => {
    if (!enabled) {
      setT(null);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (): void => {
      setT(performance.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return t;
}
