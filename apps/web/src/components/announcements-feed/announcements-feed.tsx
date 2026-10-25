'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import {
  announcementLocationHint,
  buildDatacenterNameMap,
  formatAnnouncementDate,
} from './announcements-helpers';
import { ANNOUNCEMENTS_STALE_TIME_MS, fetchAnnouncements } from './announcements-query';

type Props = {
  datacenters: AiCampusCollection | null;
  onSelectDatacenter: (id: string | null) => void;
};

/** Editorial activity stays separate from detected changes in source coverage. */
export function AnnouncementsFeed({ datacenters, onSelectDatacenter }: Props): React.JSX.Element {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isError, isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: ANNOUNCEMENTS_STALE_TIME_MS,
  });
  const names = useMemo(() => buildDatacenterNameMap(datacenters), [datacenters]);
  return (
    <section aria-label="Announcements feed" className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Industry activity</h3>
        <Link href="/news" className="text-xs text-[var(--accent-focus)]">
          Full feed ↗
        </Link>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-text-muted">
        Published news and curated announcements. All regions and companies.
      </p>
      {isLoading && (
        <p role="status" className="text-sm text-text-muted">
          Loading activity…
        </p>
      )}
      {isError && (
        <p role="alert" className="text-sm">
          Activity is unavailable.{' '}
          <button onClick={() => void refetch()} className="underline">
            Retry
          </button>
        </p>
      )}
      {!isLoading && !isError && !data?.length && (
        <p className="text-sm text-text-muted">No announcements yet.</p>
      )}
      <ol className="space-y-1">
        {data?.map((item) => {
          const active = expanded === item.id;
          const facilityExists =
            !!item.datacenter_id &&
            !!datacenters?.features.some((f) => f.properties.id === item.datacenter_id);
          return (
            <li key={item.id} className="activity-item">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-text-muted">
                <time dateTime={item.date} className="font-mono">
                  {formatAnnouncementDate(item.date)}
                </time>
                <span className="rounded border border-white/10 px-2 py-0.5">{item.category}</span>
              </div>
              <button
                aria-expanded={active}
                onClick={() => setExpanded(active ? null : item.id)}
                className="w-full text-left text-sm font-medium leading-relaxed hover:text-[var(--accent-focus)]"
              >
                {item.title}
              </button>
              <p className="mt-2 text-[11px] text-text-muted">
                {announcementLocationHint(item, names)}
              </p>
              {active && (
                <div className="mt-3 text-xs leading-relaxed text-text-muted">
                  {item.summary && <p className="mb-3">{item.summary}</p>}
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--accent-focus)] underline"
                    >
                      {item.source_name ?? 'Original source'} ↗
                    </a>
                    {facilityExists && (
                      <button
                        onClick={() => onSelectDatacenter(item.datacenter_id ?? null)}
                        className="text-[var(--accent-focus)] underline"
                      >
                        Open facility
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
