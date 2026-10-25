'use client';

import { useMemo, useState } from 'react';
import type { MapChanges } from '@gigawattmap/types';
import { useMapStore } from '@/lib/store/map-store';
import { TICKER_META_BY_SYMBOL } from '@/lib/ticker-map';
import { AnnouncementsFeed } from '@/components/announcements-feed/announcements-feed';
import { RecentChanges } from './recent-changes';
import { activityMembership, scopeChanges, type ActivityScope } from './activity-scope';
import type { AiCampusCollection } from './layers/datacenters-layer';

type Props = {
  data: AiCampusCollection | null;
  changes: MapChanges | null;
  changesUnavailable: boolean;
  onSelect: (id: string | null) => void;
};
const SCOPES = [
  { id: 'all', label: 'All activity' },
  { id: 'area', label: 'This map area' },
  { id: 'company', label: 'Selected company' },
] as const;
export function ContextualActivity({
  data,
  changes,
  changesUnavailable,
  onSelect,
}: Props): React.JSX.Element {
  const [scope, setScope] = useState<ActivityScope>('all');
  const ticker = useMapStore((s) => s.tickerFilter),
    operator = useMapStore((s) => s.operatorFilter),
    bbox = useMapStore((s) => s.visibleBbox);
  const membership = useMemo(
    () => activityMembership({ facilities: data?.features ?? [], bbox, ticker, operator }),
    [data, bbox, ticker, operator],
  );
  const filteredHistory = useMemo(
    () =>
      changes ? { ...changes, events: scopeChanges(changes.events, scope, membership) } : null,
    [changes, scope, membership],
  );
  const hasCompany = !!ticker || !!operator;
  const companyName = ticker ? (TICKER_META_BY_SYMBOL.get(ticker)?.name ?? ticker) : operator;
  const waiting = (scope === 'area' && (!data || !bbox)) || (scope === 'company' && !data);
  const message =
    scope === 'all'
      ? 'All published news and recorded dataset changes.'
      : scope === 'area'
        ? 'Only items explicitly linked to current facilities inside the map view. Company-wide and unlocated news stay under All activity.'
        : !hasCompany
          ? 'Select a company in Companies, or use operator search.'
          : `Activity linked to ${companyName}. Company-wide news is labeled separately from facility-specific news.`;
  return (
    <div>
      <div className="border-b border-[var(--border-subtle)] px-4 py-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Activity scope">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              className="workspace-button"
              aria-pressed={scope === item.id}
              onClick={() => setScope(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted" role="status">
          {waiting ? 'Waiting for map data…' : message}
        </p>
      </div>
      <RecentChanges
        history={filteredHistory}
        loading={!data}
        unavailable={changesUnavailable}
        onSelect={onSelect}
        scoped={scope !== 'all'}
      />
      <AnnouncementsFeed
        datacenters={data}
        onSelectDatacenter={onSelect}
        scope={scope}
        membership={membership}
        scopeWaiting={!!waiting}
        noCompany={scope === 'company' && !hasCompany}
      />
    </div>
  );
}
