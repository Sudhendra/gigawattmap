'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { AnnouncementCategory } from '@gigawattmap/types';
import {
  announcementLocationHint,
  buildDatacenterNameMap,
  filterAnnouncements,
  type AnnouncementFilters,
} from './announcements-helpers';
import {
  ANNOUNCEMENTS_STALE_TIME_MS,
  fetchAnnouncements,
  fetchCampusSeed,
} from './announcements-query';

const CATEGORY_OPTIONS: Array<AnnouncementCategory | 'all'> = [
  'all',
  'deal',
  'launch',
  'milestone',
  'opposition',
  'policy',
];

const DEFAULT_FILTERS: AnnouncementFilters = {
  category: 'all',
  operatorId: 'all',
  startDate: '',
  endDate: '',
};

export function NewsPageClient(): React.JSX.Element {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const announcementsQuery = useQuery({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: ANNOUNCEMENTS_STALE_TIME_MS,
  });
  const campusesQuery = useQuery({
    queryKey: ['campus-seed'],
    queryFn: fetchCampusSeed,
    staleTime: ANNOUNCEMENTS_STALE_TIME_MS,
  });

  const announcements = announcementsQuery.data ?? [];
  const datacenterNames = useMemo(
    () => buildDatacenterNameMap(campusesQuery.data ?? null),
    [campusesQuery.data],
  );
  const operatorOptions = useMemo(() => {
    return Array.from(
      new Set(
        announcements.flatMap((item) => (item.operator_id ? [item.operator_id] : [])),
      ),
    ).sort();
  }, [announcements]);
  const filtered = useMemo(() => filterAnnouncements(announcements, filters), [announcements, filters]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
          announcements feed
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-[var(--text-primary)]">
          The running ledger of AI-infrastructure launches, deals, policy moves, and pushback.
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--text-muted)]">
          Every entry links back to a source and, when possible, back to the mapped campus itself.
        </p>
      </div>

      <section
        className="mb-8 grid gap-4 rounded-3xl border p-4 md:grid-cols-4"
        style={{ borderColor: 'var(--bg-elevated)', background: 'var(--bg-panel)' }}
      >
        <FilterField label="Category">
          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({ ...current, category: event.target.value as AnnouncementCategory | 'all' }))
            }
            className="w-full rounded-xl border bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
            style={{ borderColor: 'var(--bg-elevated)' }}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Operator">
          <select
            value={filters.operatorId}
            onChange={(event) =>
              setFilters((current) => ({ ...current, operatorId: event.target.value }))
            }
            className="w-full rounded-xl border bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
            style={{ borderColor: 'var(--bg-elevated)' }}
          >
            <option value="all">all</option>
            {operatorOptions.map((operatorId) => (
              <option key={operatorId} value={operatorId}>
                {operatorId}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From">
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((current) => ({ ...current, startDate: event.target.value }))
            }
            className="w-full rounded-xl border bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
            style={{ borderColor: 'var(--bg-elevated)' }}
          />
        </FilterField>
        <FilterField label="To">
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((current) => ({ ...current, endDate: event.target.value }))
            }
            className="w-full rounded-xl border bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)]"
            style={{ borderColor: 'var(--bg-elevated)' }}
          />
        </FilterField>
      </section>

      {announcementsQuery.isLoading ? <p className="text-sm text-[var(--text-muted)]">Loading announcements…</p> : null}
      {announcementsQuery.isError ? <p className="text-sm text-[var(--status-blocked)]">Announcements could not be loaded.</p> : null}

      <div className="space-y-4">
        {filtered.map((announcement) => (
          <article
            key={announcement.id}
            className="rounded-3xl border p-5"
            style={{ borderColor: 'var(--bg-elevated)', background: 'color-mix(in oklab, var(--bg-panel) 88%, transparent)' }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <span>{announcement.date}</span>
                  <span>·</span>
                  <span>{announcement.category}</span>
                  <span>·</span>
                  <span>{announcementLocationHint(announcement, datacenterNames)}</span>
                </div>
                <h2 className="font-serif text-2xl text-[var(--text-primary)]">{announcement.title}</h2>
                {announcement.summary ? (
                  <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{announcement.summary}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                {announcement.amount_usd ? (
                  <p className="font-mono text-sm text-[var(--text-primary)]">
                    {new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                      style: 'currency',
                      currency: 'USD',
                    }).format(announcement.amount_usd)}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {announcement.datacenter_id ? (
                    <Link
                      href={`/?dc=${announcement.datacenter_id}`}
                      className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-[var(--bg-elevated)]"
                      style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                    >
                      open on map
                    </Link>
                  ) : null}
                  <a
                    href={announcement.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:bg-[var(--bg-elevated)]"
                    style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    source
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
