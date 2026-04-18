'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  searchAll,
  type SearchIndex,
  type SearchableAnnouncement,
  type SearchableDatacenter,
  type SearchableOperator,
} from '@/lib/search';

const PER_CATEGORY_LIMIT = 6;
const HINT = 'Try: Meta, Ashburn, Stargate, $NVDA, $TLN, nuclear';

export type CommandPaletteActions = {
  onSelectDatacenter: (id: string) => void;
  onSelectOperator: (id: string) => void;
  onSelectAnnouncement: (id: string) => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Built index. `null` while data is loading; the palette renders a hint state. */
  index: SearchIndex | null;
  actions: CommandPaletteActions;
};

type FlatItem =
  | { kind: 'datacenter'; item: SearchableDatacenter }
  | { kind: 'operator'; item: SearchableOperator }
  | { kind: 'announcement'; item: SearchableAnnouncement };

/**
 * Cmd+K global search popover. Radix Dialog handles overlay, focus trap, and
 * Esc-to-close; this component owns the input, the result list, and the
 * keyboard navigation (↑/↓ + Enter). Results are flattened so arrow keys
 * traverse all categories in document order, matching macOS Spotlight feel.
 */
export function CommandPalette({
  open,
  onOpenChange,
  index,
  actions,
}: CommandPaletteProps): React.JSX.Element {
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset query and selection every time the palette closes so the next
  // open is always a clean slate — avoids stale matches surprising the user.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!index) return { datacenters: [], operators: [], announcements: [] };
    return searchAll(index, query, PER_CATEGORY_LIMIT);
  }, [index, query]);

  // Flat list drives keyboard navigation. Order matches the rendered sections
  // so ↓ from the last datacenter row lands on the first operator row.
  const flat: FlatItem[] = useMemo(
    () => [
      ...results.datacenters.map<FlatItem>((item) => ({ kind: 'datacenter', item })),
      ...results.operators.map<FlatItem>((item) => ({ kind: 'operator', item })),
      ...results.announcements.map<FlatItem>((item) => ({ kind: 'announcement', item })),
    ],
    [results],
  );

  // Clamp the active row whenever the result set shrinks so an out-of-range
  // index never points at nothing.
  useEffect(() => {
    setActiveIndex((prev) => {
      if (flat.length === 0) return 0;
      return Math.min(prev, flat.length - 1);
    });
  }, [flat.length]);

  function commit(item: FlatItem): void {
    if (item.kind === 'datacenter') actions.onSelectDatacenter(item.item.id);
    else if (item.kind === 'operator') actions.onSelectOperator(item.item.id);
    else actions.onSelectAnnouncement(item.item.id);
    onOpenChange(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (flat.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const next = flat[activeIndex];
      if (next) commit(next);
    }
  }

  // Build offsets so each rendered row knows its index in the flat list and
  // can apply the active highlight when it matches activeIndex.
  const dcOffset = 0;
  const opOffset = results.datacenters.length;
  const annOffset = results.datacenters.length + results.operators.length;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.12 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              aria-labelledby="cmdk-title"
              aria-describedby={undefined}
            >
              <motion.div
                className={cn(
                  'fixed left-1/2 top-[14vh] z-50 w-full max-w-[600px] -translate-x-1/2',
                  'overflow-hidden rounded-lg border border-[var(--bg-elevated)]',
                  'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-2xl',
                )}
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0 : 0.14 }}
              >
                <Dialog.Title asChild>
                  <span id="cmdk-title" className="sr-only">
                    Search datacenters, operators, and announcements
                  </span>
                </Dialog.Title>
                <div className="flex items-center gap-3 border-b border-[var(--bg-elevated)] px-4">
                  <Search className="h-4 w-4 text-[var(--text-subtle)]" aria-hidden />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search…"
                    aria-label="Search"
                    className={cn(
                      'flex-1 bg-transparent py-3.5 text-sm outline-none',
                      'text-[var(--text-primary)] placeholder:text-[var(--text-subtle)]',
                    )}
                  />
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close search"
                      className="rounded p-1 text-[var(--text-subtle)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {query.trim().length === 0 ? (
                    <EmptyHint />
                  ) : flat.length === 0 ? (
                    <NoResults />
                  ) : (
                    <ul role="listbox" aria-label="Search results" className="py-2">
                      {results.datacenters.length > 0 ? (
                        <Section title="Datacenters">
                          {results.datacenters.map((item, i) => (
                            <DatacenterRow
                              key={item.id}
                              item={item}
                              active={dcOffset + i === activeIndex}
                              onMouseEnter={() => setActiveIndex(dcOffset + i)}
                              onClick={() => commit({ kind: 'datacenter', item })}
                            />
                          ))}
                        </Section>
                      ) : null}
                      {results.operators.length > 0 ? (
                        <Section title="Operators">
                          {results.operators.map((item, i) => (
                            <OperatorRow
                              key={item.id}
                              item={item}
                              active={opOffset + i === activeIndex}
                              onMouseEnter={() => setActiveIndex(opOffset + i)}
                              onClick={() => commit({ kind: 'operator', item })}
                            />
                          ))}
                        </Section>
                      ) : null}
                      {results.announcements.length > 0 ? (
                        <Section title="Announcements">
                          {results.announcements.map((item, i) => (
                            <AnnouncementRow
                              key={item.id}
                              item={item}
                              active={annOffset + i === activeIndex}
                              onMouseEnter={() => setActiveIndex(annOffset + i)}
                              onClick={() => commit({ kind: 'announcement', item })}
                            />
                          ))}
                        </Section>
                      ) : null}
                    </ul>
                  )}
                </div>
                <Footer />
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
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
    <li>
      <div className="px-4 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-subtle)]">
        {title}
      </div>
      <ul>{children}</ul>
    </li>
  );
}

function rowClass(active: boolean): string {
  return cn(
    'flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2 text-left text-sm',
    'transition-colors',
    active
      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
      : 'text-[var(--text-primary)]',
  );
}

function DatacenterRow({
  item,
  active,
  onClick,
  onMouseEnter,
}: {
  item: SearchableDatacenter;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}): React.JSX.Element {
  const subtitle = [item.operator_name, item.city, item.region]
    .filter((v): v is string => Boolean(v))
    .join(' · ');
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className={rowClass(active)}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        <span className="min-w-0 truncate">{item.name}</span>
        <span className="ml-3 shrink-0 truncate font-mono text-xs text-[var(--text-muted)]">
          {subtitle}
        </span>
      </button>
    </li>
  );
}

function OperatorRow({
  item,
  active,
  onClick,
  onMouseEnter,
}: {
  item: SearchableOperator;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}): React.JSX.Element {
  const facilityLabel =
    item.facility_count === 1 ? 'View 1 facility' : `View ${item.facility_count} facilities`;
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className={rowClass(active)}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="truncate">{item.name}</span>
          {item.ticker ? (
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-subtle)]">
              ${item.ticker}
            </span>
          ) : null}
        </span>
        <span className="ml-3 shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {facilityLabel}
        </span>
      </button>
    </li>
  );
}

function AnnouncementRow({
  item,
  active,
  onClick,
  onMouseEnter,
}: {
  item: SearchableAnnouncement;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}): React.JSX.Element {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className={rowClass(active)}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
      >
        <span className="min-w-0 truncate">{item.title}</span>
        <span className="ml-3 shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {item.date}
        </span>
      </button>
    </li>
  );
}

function EmptyHint(): React.JSX.Element {
  return (
    <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">{HINT}</div>
  );
}

function NoResults(): React.JSX.Element {
  return (
    <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
      No matches.
    </div>
  );
}

function Footer(): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-t border-[var(--bg-elevated)] px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-subtle)]">
      <span>↑↓ navigate · ↵ select</span>
      <span>esc close</span>
    </div>
  );
}
