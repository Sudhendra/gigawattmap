'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { AiCampusCollection } from '@/components/map/layers/datacenters-layer';
import {
  facilityEvidence,
  publicationLabel,
} from '@/components/intelligence-card/facility-evidence';
import { useComparisonStore } from './comparison-store';

type Props = { data: AiCampusCollection | null; publishedAt: string | null };
export function ComparisonTray({ data, publishedAt }: Props): React.JSX.Element | null {
  const { ids, add, remove, clear } = useComparisonStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const matches = search
    ? (data?.features ?? [])
        .filter(
          (f) =>
            !ids.includes(f.properties.id) &&
            `${f.properties.name} ${f.properties.operator} ${f.properties.country} ${f.properties.region ?? ''}`
              .toLocaleLowerCase()
              .includes(search),
        )
        .slice(0, 8)
    : [];
  const chooseMore = (): void => {
    setQuery('');
    setOpen(true);
  };
  const features = ids.map((id) => ({
    id,
    feature: data?.features.find((f) => f.properties.id === id),
  }));
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <section
        aria-label="Comparison tray"
        className="shrink-0 border-t border-[var(--border-subtle)] bg-bg-panel p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold">Compare facilities</p>
            <p className="mt-1 text-[11px] text-text-muted" role="status" aria-live="polite">
              {ids.length === 0
                ? 'Choose 2–3 facilities to compare side by side.'
                : ids.length === 1
                  ? '1 selected · add another to compare.'
                  : `${ids.length} selected · ready to compare.`}
            </p>
          </div>
          <Dialog.Trigger className="workspace-button" onClick={() => setQuery('')}>
            {ids.length >= 2
              ? 'View comparison'
              : ids.length === 1
                ? 'Add another'
                : 'Choose facilities'}
          </Dialog.Trigger>
        </div>
        {ids.length > 0 && (
          <>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected comparison facilities">
              {features.map(({ id, feature }, index) => (
                <li
                  key={id}
                  className="flex min-w-0 max-w-full items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-bg-base pl-2 text-xs"
                >
                  <span className="text-[var(--accent-focus)]">{index + 1}</span>
                  <span className="truncate" title={feature?.properties.name ?? id}>
                    {feature?.properties.name ?? id}
                  </span>
                  <button
                    className="shrink-0 px-2 py-2 text-text-muted hover:text-text-primary"
                    aria-label={`Remove ${feature?.properties.name ?? id} from tray`}
                    onClick={() => remove(id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between text-xs">
              {ids.length < 3 && (
                <button className="text-[var(--accent-focus)] underline" onClick={chooseMore}>
                  + Add facility
                </button>
              )}
              <button className="ml-auto text-text-muted underline" onClick={clear}>
                Clear comparison
              </button>
            </div>
          </>
        )}
      </section>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-24px)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[var(--border-subtle)] bg-bg-panel p-5 text-text-primary shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold">Facility comparison</Dialog.Title>
            <Dialog.Close className="workspace-button">Close comparison</Dialog.Close>
          </div>
          <Dialog.Description className="my-3 text-xs leading-relaxed text-text-muted">
            Choose up to three facilities. Compare recorded facts and inspect their sources.
          </Dialog.Description>
          <div className="min-h-0 overflow-y-auto">
            <div className="mb-4 rounded-lg border border-[var(--border-subtle)] bg-bg-base p-3">
              <p role="status" aria-live="polite" className="mb-2 text-xs text-text-muted">
                {ids.length}/3 selected
                {ids.length === 1
                  ? ' · Choose one more for a side-by-side comparison'
                  : ids.length === 3
                    ? ' · Remove a facility to replace it'
                    : ''}
              </p>
              {features.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2" aria-label="Comparison selections">
                  {features.map(({ id, feature }, index) => (
                    <li
                      key={id}
                      className="flex max-w-full items-center gap-2 rounded border border-[var(--border-subtle)] pl-2 text-xs"
                    >
                      <span className="text-[var(--accent-focus)]">{index + 1}</span>
                      <span className="truncate">{feature?.properties.name ?? id}</span>
                      <button
                        className="px-3 py-2"
                        aria-label={`Remove ${feature?.properties.name ?? id} from comparison`}
                        onClick={() => remove(id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {ids.length < 3 && (
                <>
                  <label htmlFor="comparison-search" className="mb-1 block text-xs font-medium">
                    Add a facility
                  </label>
                  <input
                    id="comparison-search"
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-bg-panel px-3 py-2 text-sm outline-none focus:border-[var(--accent-focus)]"
                    placeholder="Search name, operator or location…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {!data ? (
                    <p role="status" className="mt-2 text-xs text-text-muted">
                      Waiting for map data. If loading failed, reload the map to retry.
                    </p>
                  ) : search ? (
                    <>
                      <p role="status" className="mt-2 text-xs text-text-muted">
                        {matches.length
                          ? `Showing ${matches.length} matches. Select one to add it.`
                          : 'No unselected facilities match. Try another name or location.'}
                      </p>
                      <ul
                        className="mt-2 max-h-44 overflow-auto"
                        aria-label="Facilities to compare"
                      >
                        {matches.map((f) => (
                          <li key={f.properties.id}>
                            <button
                              className="flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left hover:bg-bg-panel focus:bg-bg-panel"
                              aria-label={`Add ${f.properties.name} to comparison`}
                              onClick={() => {
                                add(f.properties.id);
                                setQuery('');
                              }}
                            >
                              <span className="min-w-0">
                                <span className="block text-sm">{f.properties.name}</span>
                                <span className="block text-[11px] text-text-muted">
                                  {f.properties.operator} ·{' '}
                                  {[f.properties.region, f.properties.country]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              </span>
                              <span aria-hidden="true" className="text-[var(--accent-focus)]">
                                + Add
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-text-muted">
                      Search above, or add facilities from their map cards.
                    </p>
                  )}
                </>
              )}
            </div>
            {ids.length === 0 && (
              <p className="py-6 text-center text-sm text-text-muted">
                Start with a facility you know. Then add a peer to compare capacity, status and
                source evidence.
              </p>
            )}
            {ids.length > 0 && (
              <>
                <p className="mb-2 text-[11px] text-text-muted md:hidden">
                  Swipe the table sideways to compare all facilities.
                </p>
                <div className="overflow-auto" tabIndex={0} aria-label="Comparison table">
                  <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Side-by-side facility facts and source evidence
                    </caption>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-bg-panel p-3">Field</th>
                        {features.map(({ id, feature }) => (
                          <th key={id} className="min-w-52 p-3 align-top">
                            {feature?.properties.name ?? 'Facility unavailable'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        'Operator',
                        'Tenant',
                        'Location',
                        'Status',
                        'Estimated capacity',
                        'Source evidence',
                      ].map((label) => (
                        <tr key={label} className="border-t border-[var(--border-subtle)]">
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-bg-panel p-3 align-top text-xs text-text-muted"
                          >
                            {label}
                          </th>
                          {features.map(({ id, feature }) => {
                            const p = feature?.properties;
                            const evidence = p ? facilityEvidence(p) : null;
                            return (
                              <td key={id} className="p-3 align-top">
                                {!p ? (
                                  'Not in current snapshot'
                                ) : label === 'Operator' ? (
                                  p.operator || 'Unknown'
                                ) : label === 'Tenant' ? (
                                  p.tenant || 'Unknown'
                                ) : label === 'Location' ? (
                                  [p.region, p.country === 'XX' ? 'Country unknown' : p.country]
                                    .filter(Boolean)
                                    .join(', ')
                                ) : label === 'Status' ? (
                                  (p.status ?? 'Unknown')
                                ) : label === 'Estimated capacity' ? (
                                  evidence?.capacityKnown ? (
                                    `${p.est_mw_mid?.toLocaleString('en-US')} MW`
                                  ) : (
                                    'Unknown'
                                  )
                                ) : (
                                  <>
                                    <p className="mb-2 text-xs">{evidence?.provenance}</p>
                                    {evidence?.links.length ? (
                                      evidence.links.map((link) => (
                                        <a
                                          key={link.url}
                                          className="mb-2 block text-xs underline"
                                          href={link.url}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {link.label} ↗
                                        </a>
                                      ))
                                    ) : (
                                      <span className="text-xs text-text-muted">
                                        No facility source link recorded
                                      </span>
                                    )}
                                    {p.sources?.includes('osm') && (
                                      <p className="text-[10px] text-text-muted">
                                        © OpenStreetMap contributors · ODbL
                                      </p>
                                    )}
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
                  Capacity is estimated, not measured operating load. Unknown does not mean zero.
                  Dataset published {publicationLabel(publishedAt)}; facility verification dates are
                  not recorded.
                </p>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
