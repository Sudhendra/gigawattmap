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
  const { ids, remove, clear } = useComparisonStore();
  const [open, setOpen] = useState(false);
  if (!ids.length) return null;
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
          <Dialog.Trigger className="workspace-button">
            Compare facilities ({ids.length}/3)
          </Dialog.Trigger>
          <button className="text-xs text-text-muted underline" onClick={clear}>
            Clear comparison
          </button>
        </div>
        <p className="mt-2 text-[11px] text-text-muted">
          {features.map(({ id, feature }) => feature?.properties.name ?? id).join(' · ')}
        </p>
      </section>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-24px)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-[var(--border-subtle)] bg-bg-panel p-5 text-text-primary shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-xl font-semibold">Facility comparison</Dialog.Title>
            <Dialog.Close className="workspace-button">Close comparison</Dialog.Close>
          </div>
          <Dialog.Description className="my-3 text-xs leading-relaxed text-text-muted">
            Recorded facts from the current snapshot. Capacity is estimated, not measured operating
            load. Unknown does not mean zero. Dataset published {publicationLabel(publishedAt)};
            facility verification dates are not recorded.
          </Dialog.Description>
          <p className="mb-2 text-[11px] text-text-muted md:hidden">
            Swipe the table sideways to compare all facilities.
          </p>
          <div className="overflow-auto" tabIndex={0} aria-label="Comparison table">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Side-by-side facility facts and source evidence</caption>
              <thead>
                <tr>
                  <th className="p-3">Field</th>
                  {features.map(({ id, feature }) => (
                    <th key={id} className="min-w-52 p-3 align-top">
                      {feature?.properties.name ?? 'Facility unavailable'}
                      <button
                        className="mt-2 block text-xs font-normal text-text-muted underline"
                        aria-label={`Remove ${feature?.properties.name ?? id} from comparison`}
                        onClick={() => {
                          remove(id);
                          if (ids.length === 1) setOpen(false);
                        }}
                      >
                        Remove
                      </button>
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
                    <th scope="row" className="p-3 align-top text-xs text-text-muted">
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
          {ids.length < 3 && (
            <p className="mt-3 text-xs text-text-muted">
              Close this comparison and open another facility card to add it. Up to three
              facilities.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
