'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchLiveRelease } from '@/lib/live-release';

export function NewsFreshness(): React.JSX.Element {
  const { data, isError } = useQuery({
    queryKey: ['news-freshness'],
    queryFn: () => fetchLiveRelease('news'),
    staleTime: 300_000,
    refetchInterval: 300_000,
  });
  const stale = data && Date.now() - Date.parse(data.updated_at) > 48 * 60 * 60 * 1000;
  return (
    <p role="status" className="mb-4 text-sm text-text-muted">
      {isError
        ? 'Refresh status unavailable. Previously loaded news may be out of date.'
        : data
          ? `${stale ? 'Refresh overdue · ' : ''}Feed checked ${new Date(data.updated_at).toLocaleString()}. Headlines link to the original publisher; curated entries are reviewed separately.`
          : 'Checking feed freshness…'}
    </p>
  );
}
