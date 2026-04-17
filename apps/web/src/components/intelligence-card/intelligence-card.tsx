'use client';

import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AiCampusFeature } from '@/components/map/layers/datacenters-layer';
import { cn } from '@/lib/cn';
import { FieldRow } from './field-row';
import { StatusBadge } from './status-badge';

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
          <Placeholder>Utility, plant, and substation joins land in task 017.</Placeholder>
        </Section>

        <Section title="Water">
          <Placeholder>WRI Aqueduct stress integration coming in v1.5.</Placeholder>
        </Section>

        <Section title="Context">
          <Placeholder>Press and announcement notes attach when the deals feed lands (task 021).</Placeholder>
        </Section>

        <Section title="Market exposure">
          <Placeholder>Ticker links activate with the market panel (task 020).</Placeholder>
        </Section>

        <Section title="Sources">
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Hand-curated seed dataset · Cross-checked against operator press releases ·
            OpenStreetMap (ODbL) once the pipeline lands.
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

function titleCase(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
