import type { TickerQuote } from './types';

import { API_BASE } from '@/lib/env';

const TICKERS_URL = `${API_BASE}/api/v1/tickers`;

export async function fetchTickers(): Promise<TickerQuote[]> {
  const res = await fetch(TICKERS_URL, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`tickers ${res.status}`);
  return (await res.json()) as TickerQuote[];
}

