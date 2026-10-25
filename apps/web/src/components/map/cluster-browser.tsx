'use client';

import { useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { AiCampusFeature } from './layers/datacenters-layer';
import { clusterFacilities, matchesCompany } from './cluster-facilities';

type Props = {
  count: number;
  facilities: AiCampusFeature[] | null;
  error: string | null;
  operators: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onClose: () => void;
  onZoom: () => void;
  onRetry: () => void;
  onRestoreFocus: () => void;
};

export function ClusterBrowser({
  count,
  facilities,
  error,
  operators,
  onSelect,
  onClose,
  onZoom,
  onRetry,
  onRestoreFocus,
}: Props): React.JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const results = useMemo(
    () => clusterFacilities(facilities ?? [], operators, query),
    [facilities, operators, query],
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus();
          }}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-white/15 bg-[var(--bg-panel)] p-4 text-[var(--text-primary)] shadow-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">
              {count.toLocaleString()} facilities in this cluster
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close facility list"
              className="rounded p-2 hover:bg-white/10"
            >
              ✕
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-[var(--text-muted)]">
            Choose a facility to open its card.{' '}
            {operators.size > 0 ? 'Company matches appear first.' : 'No extra zooming needed.'}
          </Dialog.Description>
          <label className="mt-4 text-xs" htmlFor="cluster-search">
            Search this cluster
          </label>
          <input
            ref={searchRef}
            id="cluster-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(50);
            }}
            placeholder="Name, operator, location or ID"
            className="mt-1 rounded border border-white/20 bg-transparent p-2 text-sm outline-offset-2"
          />
          <button
            type="button"
            onClick={onZoom}
            className="my-3 self-start text-sm text-[var(--accent-focus)] underline"
          >
            Zoom into area instead
          </button>
          {error ? (
            <p role="alert" className="py-4 text-sm">
              {error}{' '}
              <button type="button" onClick={onRetry} className="underline">
                Retry
              </button>
            </p>
          ) : facilities === null ? (
            <p role="status" className="py-4 text-sm">
              Loading facilities…
            </p>
          ) : (
            <div className="min-h-0 overflow-y-auto">
              <p role="status" className="mb-2 text-xs text-[var(--text-muted)]">
                {results.length.toLocaleString()} {results.length === 1 ? 'facility' : 'facilities'}
                {query ? ' found' : ''}
              </p>
              {results.length === 0 && (
                <p className="py-4 text-sm">No facilities match your search.</p>
              )}
              <ul className="space-y-1">
                {results.slice(0, limit).map((feature) => {
                  const p = feature.properties;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(p.id)}
                        className="w-full rounded border border-white/10 p-3 text-left hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <span className="block text-sm font-medium">
                          {p.name || 'Unnamed facility'}
                        </span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {p.operator || 'Unknown operator'} ·{' '}
                          {[p.region, p.country === 'XX' ? null : p.country]
                            .filter(Boolean)
                            .join(', ') || 'Location unspecified'}
                        </span>
                        {matchesCompany(feature, operators) && (
                          <span className="block text-xs text-[var(--accent-focus)]">
                            Company match
                          </span>
                        )}
                        <span className="mt-1 block break-all text-[10px] text-[var(--text-muted)]">
                          {p.id}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {results.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit((value) => value + 50)}
                  className="my-3 w-full rounded border border-white/20 p-2 text-sm"
                >
                  Show next {Math.min(50, results.length - limit)} facilities
                </button>
              )}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
