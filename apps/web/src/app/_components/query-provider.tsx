'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Single QueryClient per browser session. We instantiate it inside `useState`
 * so React's Strict-Mode double-mount doesn't create two clients in dev.
 *
 * Defaults:
 *   - `staleTime: 5 min` — matches the ticker panel's refresh cadence so the
 *     UI doesn't refetch on every focus event.
 *   - `refetchOnWindowFocus: false` — focus-driven refetches are noisy on
 *     a map app (users tab in to look at one thing).
 *   - `retry: 1` — the upstream is already cached at the Worker for 10 min;
 *     a single retry is enough to ride out transient blips.
 */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [client] = useState(makeClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
