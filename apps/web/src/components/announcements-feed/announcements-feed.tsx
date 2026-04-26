'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ExternalLink, Newspaper } from 'lucide-react';
import type { Announcement } from '@gigawattmap/types';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import { usePrefersReducedMotion } from '@/lib/hooks/use-animation-clock';
import {
  announcementLocationHint,
  buildDatacenterNameMap,
} from './announcements-helpers';
import {
  ANNOUNCEMENTS_STALE_TIME_MS,
  fetchAnnouncements,
} from './announcements-query';

type AnnouncementsFeedProps = {
  datacenters: AiCampusCollection | null;
  onSelectDatacenter: (id: string | null) => void;
};

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
  style: 'currency',
  currency: 'USD',
});

const CATEGORY_STYLES: Record<Announcement['category'], string> = {
  deal: 'var(--dc-hyperscale)',
  launch: 'var(--status-announced)',
  milestone: 'var(--accent-cable)',
  opposition: 'var(--status-blocked)',
  policy: 'var(--dc-colo)',
};

export function AnnouncementsFeed({
  datacenters,
  onSelectDatacenter,
}: AnnouncementsFeedProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [inlineDetail, setInlineDetail] = useState<Announcement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduceMotion = usePrefersReducedMotion();
  const { data, isError, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: ANNOUNCEMENTS_STALE_TIME_MS,
  });

  const datacenterNames = useMemo(() => buildDatacenterNameMap(datacenters), [datacenters]);
  const items = data ?? [];

  if (collapsed) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-18 z-10 flex justify-end px-4">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] shadow-lg backdrop-blur transition-colors hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
          style={{
            background: 'color-mix(in oklab, var(--bg-panel) 92%, transparent)',
            borderColor: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
          }}
          aria-label="Expand announcements feed"
        >
          <Newspaper size={12} aria-hidden />
          news
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-18 z-10 flex justify-center px-4">
      <aside
        className="pointer-events-auto flex min-h-[260px] w-full max-w-6xl flex-col rounded-2xl border shadow-2xl backdrop-blur"
        style={{
          background: 'color-mix(in oklab, var(--bg-panel) 94%, transparent)',
          borderColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
        aria-label="Announcements feed"
      >
        <header
          className="flex items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: 'var(--bg-elevated)' }}
        >
          <div className="flex items-center gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                announcements
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                Material AI-infrastructure news pinned to the map.
              </p>
            </div>
            <Link
              href="/news"
              className="rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
              style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              full feed
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-full p-2 transition-colors hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
            aria-label="Collapse announcements feed"
          >
            <ChevronDown size={14} aria-hidden />
          </button>
        </header>

        <div className="overflow-x-auto px-4 py-4">
          <div className="flex min-w-max gap-3">
            {isLoading ? <LoadingCards /> : null}
            {isError ? <ErrorCard /> : null}
            {!isLoading && !isError && items.length === 0 ? <EmptyCard /> : null}
            {items.map((announcement, index) => {
              const locationHint = announcementLocationHint(announcement, datacenterNames);
              const active = inlineDetail?.id === announcement.id;
              return (
                <button
                  key={announcement.id}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  type="button"
                  onClick={() => {
                    if (announcement.datacenter_id) {
                      onSelectDatacenter(announcement.datacenter_id);
                      setInlineDetail(null);
                      return;
                    }
                    setInlineDetail(active ? null : announcement);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                    event.preventDefault();
                    const delta = event.key === 'ArrowRight' ? 1 : -1;
                    const nextIndex = index + delta;
                    const next = cardRefs.current[nextIndex];
                    next?.focus();
                    if (!reduceMotion) next?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                  }}
                  className="flex min-h-36 w-72 shrink-0 flex-col rounded-2xl border p-3 text-left transition-colors hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
                  style={{
                    borderColor: active ? 'var(--accent-focus)' : 'var(--bg-elevated)',
                    background: active ? 'color-mix(in oklab, var(--bg-elevated) 85%, transparent)' : undefined,
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <span className="rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-primary)] tabular" style={{ borderColor: 'var(--bg-elevated)' }}>
                      {DATE_FORMATTER.format(new Date(`${announcement.date}T00:00:00Z`))}
                    </span>
                    <span
                      className="rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                      style={{
                        color: CATEGORY_STYLES[announcement.category],
                        background: 'color-mix(in oklab, var(--bg-base) 72%, transparent)',
                      }}
                    >
                      {announcement.category}
                    </span>
                  </div>
                  <h3 className="font-serif text-base leading-tight text-[var(--text-primary)]">
                    {announcement.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-[var(--text-muted)] tabular">
                      {formatAmount(announcement.amount_usd)}
                    </span>
                    <span className="truncate text-xs text-[var(--text-muted)]">{locationHint}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {inlineDetail ? (
          <div
            className="border-t px-4 py-3"
            style={{ borderColor: 'var(--bg-elevated)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  inline detail
                </p>
                <h3 className="mt-1 font-serif text-lg text-[var(--text-primary)]">
                  {inlineDetail.title}
                </h3>
                {inlineDetail.summary ? (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
                    {inlineDetail.summary}
                  </p>
                ) : null}
              </div>
              <a
                href={inlineDetail.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
                style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                source
                <ExternalLink size={12} aria-hidden />
              </a>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return 'Undisclosed';
  return MONEY_FORMATTER.format(amount);
}

function LoadingCards(): React.JSX.Element {
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="h-36 w-72 shrink-0 animate-pulse rounded-2xl border"
          style={{ borderColor: 'var(--bg-elevated)', background: 'var(--bg-elevated)' }}
          aria-hidden
        />
      ))}
    </>
  );
}

function ErrorCard(): React.JSX.Element {
  return (
    <div
      className="w-72 shrink-0 rounded-2xl border p-4"
      style={{ borderColor: 'var(--status-blocked)' }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--status-blocked)]">
        feed unavailable
      </p>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Announcements could not be loaded. The rest of the map is still usable.
      </p>
    </div>
  );
}

function EmptyCard(): React.JSX.Element {
  return (
    <div
      className="w-72 shrink-0 rounded-2xl border p-4"
      style={{ borderColor: 'var(--bg-elevated)' }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        no announcements yet
      </p>
    </div>
  );
}
