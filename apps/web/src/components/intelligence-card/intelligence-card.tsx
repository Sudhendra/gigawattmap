'use client';

import { useEffect, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AiCampusFeature } from '@/components/map/layers/datacenters-layer';
import {
  ANNOUNCEMENTS_STALE_TIME_MS,
  fetchAnnouncements,
} from '@/components/announcements-feed/announcements-query';
import { SEARCH_INDEX_URL } from '@/lib/env';
import type { SearchCorpus } from '@/lib/search';
import { useMapStore } from '@/lib/store/map-store';
import { TICKER_META_BY_SYMBOL, SECTION_LABEL } from '@/lib/ticker-map';
import { cn } from '@/lib/cn';
import { FieldRow } from './field-row';
import { StatusBadge } from './status-badge';
import {
  selectAnnouncementsForCampus,
  tickerForOperator,
} from './intelligence-card-helpers';

type IntelligenceCardProps = {
  feature: AiCampusFeature | null;
  onClose: () => void;
};

/** Format a number with thousands separators, or em-dash for null/undefined. */
function fmtNum(n: number | null | undefined, suffix = ''): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-US')}${suffix}`;
}

/** Build a sharable absolute URL for the current selection. */
function buildShareUrl(id: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('dc', id);
  return url.toString();
}

/**
 * Right-anchored detail drawer. Controlled by the parent (open ↔ feature).
 * Closes on Esc, overlay click, or the explicit close button. Animation is
 * a 250ms slide-in spring; honors prefers-reduced-motion.
 */
export function IntelligenceCard({ feature, onClose }: IntelligenceCardProps): React.JSX.Element {
  const open = feature != null;
  const reduceMotion = useReducedMotion();

  // Defensive: if feature unmounts while drawer is open (data refresh, etc.),
  // call onClose so URL state stays consistent.
  useEffect(() => {
    if (!feature && open) onClose();
  }, [feature, open, onClose]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AnimatePresence>
        {open && feature ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              aria-labelledby="intel-card-title"
              aria-describedby={undefined}
            >
              <motion.aside
                className={cn(
                  'fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[420px] flex-col',
                  'border-l border-[var(--bg-elevated)] bg-[var(--bg-panel)] text-[var(--text-primary)]',
                  'shadow-[0_0_60px_rgba(0,0,0,0.5)]',
                )}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }
                }
              >
                <CardBody feature={feature} onClose={onClose} />
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function CardBody({
  feature,
  onClose,
}: {
  feature: AiCampusFeature;
  onClose: () => void;
}): React.JSX.Element {
  const p = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;
  const locStr = `${typeof lat === 'number' ? lat.toFixed(2) : '—'}°, ${typeof lon === 'number' ? lon.toFixed(2) : '—'}° · ${p.country}`;

  const handleShare = async (): Promise<void> => {
    const url = buildShareUrl(p.id);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b border-[var(--bg-elevated)] px-5 py-4">
        <div className="min-w-0 flex-1">
          <Dialog.Title asChild>
            <h2
              id="intel-card-title"
              className="font-display text-[15px] font-semibold uppercase tracking-[0.08em] text-[var(--text-primary)]"
            >
              {p.name}
            </h2>
          </Dialog.Title>
          <p className="mt-1 text-xs text-[var(--text-muted)] tabular">{locStr}</p>
          <div className="mt-2">
            <StatusBadge status={p.status} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="rounded p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-focus)]"
            aria-label="Copy share link"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <Dialog.Close asChild>
            <button
              type="button"
              className="rounded p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-focus)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Stats row */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <Stat label="Est. capacity" value={fmtNum(p.est_mw_mid, ' MW')} />
          <Stat label="Tier" value={titleCase(p.tier)} />
        </div>

        <Section title="Operator">
          <dl>
            <FieldRow label="Operator">{p.operator}</FieldRow>
            <FieldRow label="Tenants">{p.tenant}</FieldRow>
          </dl>
        </Section>

        <Section title="Power">
          <PowerSection
            distanceKm={p.nearest_substation_distance_km}
            voltageKv={p.nearest_substation_voltage_kv}
          />
        </Section>

        <Section title="Water">
          <Placeholder>WRI Aqueduct stress integration coming in v1.5.</Placeholder>
        </Section>

        <Section title="Context">
          <ContextSection campus={feature} />
        </Section>

        <Section title="Market exposure">
          <MarketExposureSection operatorDisplayName={p.operator} />
        </Section>

        <Section title="Sources">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Hand-curated CSV of ~50 campuses · cross-checked against operator
            press releases · substation enrichment from OpenStreetMap (ODbL)
            and the Global Energy Monitor power-plant database (CC BY 4.0).
          </p>
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded border border-[var(--bg-elevated)] bg-[var(--bg-base)]/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-subtle)]">
        {label}
      </div>
      <div className="mt-0.5 font-display text-base text-[var(--text-primary)] tabular">{value}</div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="rounded border border-dashed border-[var(--bg-elevated)] px-3 py-2 text-xs italic text-[var(--text-muted)]">
      {children}
    </p>
  );
}

/**
 * "POWER" section content. Renders the nearest substation match from
 * task 017's enrichment. ≥100 kV is "high voltage" — visually emphasized;
 * below that, shown but un-highlighted. Null distance means no substation
 * was found within the 10 km search radius.
 */
function PowerSection({
  distanceKm,
  voltageKv,
}: {
  distanceKm: number | null | undefined;
  voltageKv: number | null | undefined;
}): React.JSX.Element {
  if (distanceKm == null) {
    return (
      <Placeholder>
        No substation data within 10 km. (Common outside the US/EU OSM coverage
        envelope.)
      </Placeholder>
    );
  }
  const isHighVoltage = typeof voltageKv === 'number' && voltageKv >= 100;
  return (
    <dl>
      <FieldRow label="Nearest substation">
        <span className="tabular">{distanceKm.toFixed(1)} km</span>
        {voltageKv != null ? (
          <>
            <span className="text-[var(--text-subtle)]"> · </span>
            <span
              className={cn(
                'tabular',
                isHighVoltage
                  ? 'font-medium text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)]',
              )}
            >
              {voltageKv} kV
            </span>
          </>
        ) : (
          <>
            <span className="text-[var(--text-subtle)]"> · </span>
            <span className="text-[var(--text-muted)]">voltage unknown</span>
          </>
        )}
      </FieldRow>
      <p className="mt-2 text-[10px] leading-relaxed text-[var(--text-subtle)]">
        Source: OpenStreetMap (ODbL). Distance is great-circle from the
        campus centroid to the substation centroid.
      </p>
    </dl>
  );
}

function titleCase(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

const SEARCH_INDEX_SEED_URL = '/seed/search-index.json';

async function fetchSearchCorpus(): Promise<SearchCorpus> {
  const url = SEARCH_INDEX_URL ?? SEARCH_INDEX_SEED_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`search-index ${res.status}`);
  return (await res.json()) as SearchCorpus;
}

const ANNOUNCEMENT_CATEGORY_LABEL: Record<string, string> = {
  deal: 'deal',
  launch: 'launch',
  milestone: 'milestone',
  opposition: 'opposition',
  policy: 'policy',
};

/**
 * "CONTEXT" section. Shows up to 3 most recent announcements joined to
 * this campus by either `datacenter_id` or `operator_id`. Operator-id
 * resolution requires a display-name → slug lookup, which we get from
 * the same search-index payload `useSearchIndex` consumes (cached for
 * the session via TanStack Query). When the corpus hasn't loaded yet we
 * still surface direct datacenter_id matches.
 */
function ContextSection({ campus }: { campus: AiCampusFeature }): React.JSX.Element {
  const announcementsQuery = useQuery({
    queryKey: ['announcements'],
    queryFn: fetchAnnouncements,
    staleTime: ANNOUNCEMENTS_STALE_TIME_MS,
  });
  const corpusQuery = useQuery({
    queryKey: ['search-corpus'],
    queryFn: fetchSearchCorpus,
    staleTime: 60 * 60 * 1000,
  });

  const operatorId = useMemo(() => {
    const corpus = corpusQuery.data;
    if (!corpus) return null;
    const display = campus.properties.operator;
    return corpus.operators.find((o) => o.name === display)?.id ?? null;
  }, [corpusQuery.data, campus.properties.operator]);

  const items = useMemo(
    () =>
      selectAnnouncementsForCampus(
        announcementsQuery.data ?? [],
        campus.properties.id,
        operatorId,
        3,
      ),
    [announcementsQuery.data, campus.properties.id, operatorId],
  );

  if (announcementsQuery.isLoading) {
    return <p className="text-xs text-[var(--text-muted)]">Loading announcements…</p>;
  }
  if (items.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">No recent announcements.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="text-xs leading-snug">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-subtle)] tabular">
            <time dateTime={a.date}>{a.date}</time>
            <span>·</span>
            <span>{ANNOUNCEMENT_CATEGORY_LABEL[a.category] ?? a.category}</span>
          </div>
          <a
            href={a.source_url}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block text-[var(--text-primary)] underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {a.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * "MARKET EXPOSURE" section. Renders a clickable ticker chip when the
 * operator has a public listing in our editorial map. Clicking calls
 * `setTickerFilter(symbol)` — the same store action the ticker panel
 * uses, so the map dim/highlight behavior is identical and the user
 * sees the panel reflect the selection.
 */
function MarketExposureSection({
  operatorDisplayName,
}: {
  operatorDisplayName: string;
}): React.JSX.Element {
  const setTickerFilter = useMapStore((s) => s.setTickerFilter);
  const symbol = tickerForOperator(operatorDisplayName);
  if (!symbol) {
    return <p className="text-xs text-[var(--text-muted)]">No public ticker linked.</p>;
  }
  const meta = TICKER_META_BY_SYMBOL.get(symbol);
  return (
    <button
      type="button"
      onClick={() => setTickerFilter(symbol)}
      className={cn(
        'inline-flex items-center gap-2 rounded border border-[var(--bg-elevated)] bg-[var(--bg-base)]/40 px-3 py-1.5 text-xs',
        'text-[var(--text-primary)] transition hover:border-[var(--accent-focus)] hover:bg-[var(--bg-elevated)]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-focus)]',
      )}
      aria-label={`Filter map by ${symbol}`}
    >
      <span className="font-display font-semibold tabular">${symbol}</span>
      {meta ? (
        <span className="text-[var(--text-muted)]">
          {meta.name} · {SECTION_LABEL[meta.section]}
        </span>
      ) : null}
    </button>
  );
}
