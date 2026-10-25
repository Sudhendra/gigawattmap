'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MapChanges, DatasetFieldChange } from '@gigawattmap/types';

const LABELS: Record<DatasetFieldChange['field'], string> = {
  operator: 'Operator',
  status: 'Status',
  est_mw_mid: 'Estimated capacity',
};
function valueLabel(value: string | number | null, field: DatasetFieldChange['field']): string {
  if (value === null || value === 'Unknown') return 'Unknown';
  return field === 'est_mw_mid' ? `${value} MW` : String(value);
}

type Props = {
  history: MapChanges | null;
  loading: boolean;
  unavailable: boolean;
  onSelect?: (id: string) => void;
};

export function RecentChanges({
  history,
  loading,
  unavailable,
  onSelect,
}: Props): React.JSX.Element {
  const [limit, setLimit] = useState(20);
  return (
    <details className="mx-4 my-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] text-[var(--text-primary)]">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)]">
        Recent dataset changes{history ? ` · ${history.events.length}` : ''}
      </summary>
      <section
        aria-label="Recent dataset changes"
        className="max-h-[50dvh] overflow-y-auto border-t border-[var(--bg-elevated)] px-4 py-3 text-xs"
      >
        <p className="mb-3 text-[var(--text-muted)]">
          Changes in our coverage, not proof of construction or opening. Dates show when a refresh
          detected a change. Latest 500 events within 90 days; only facilities still in the dataset
          are listed.
        </p>
        {loading ? (
          <p role="status">Loading change history…</p>
        ) : unavailable || !history ? (
          <p role="status">Change history is unavailable for this snapshot. Reload to retry.</p>
        ) : (
          <>
            <p className="mb-3 text-[var(--text-muted)]">
              Tracking since {new Date(history.baseline_at).toLocaleDateString()}.
            </p>
            {!history.compared_at ? (
              <p role="status">
                Baseline established. Changes will appear after a future successful refresh.
              </p>
            ) : history.events.length === 0 ? (
              <p role="status">
                No recorded changes to current facilities within the history window.
              </p>
            ) : (
              <ol className="space-y-4">
                {history.events.slice(0, limit).map((event) => (
                  <li key={event.id} className="border-b border-[var(--bg-elevated)] pb-3">
                    <p className="mb-1 text-[var(--text-muted)]">
                      {event.kind === 'added' ? 'Added to dataset' : 'Fields updated'} ·{' '}
                      <time dateTime={event.detected_at}>
                        {new Date(event.detected_at).toLocaleDateString()}
                      </time>
                    </p>
                    {onSelect ? (
                      <button
                        className="text-left font-medium underline underline-offset-2"
                        onClick={() => onSelect(event.facility_id)}
                      >
                        {event.facility_name}
                      </button>
                    ) : (
                      <Link
                        href={`/?dc=${encodeURIComponent(event.facility_id)}`}
                        className="font-medium underline underline-offset-2"
                      >
                        {event.facility_name}
                      </Link>
                    )}
                    {event.fields.map((field) => (
                      <p key={field.field} className="mt-1">
                        {LABELS[field.field]}: {valueLabel(field.before, field.field)} →{' '}
                        {valueLabel(field.after, field.field)}
                      </p>
                    ))}
                    <p className="mt-2 text-[var(--text-muted)]">
                      Sources:{' '}
                      {event.sources
                        .map((source) =>
                          source === 'osm'
                            ? '© OpenStreetMap contributors (ODbL)'
                            : source === 'curated'
                              ? 'Curated AI campuses'
                              : source,
                        )
                        .join(', ') || 'Not supplied'}
                      .{' '}
                      <Link href="/about" className="underline">
                        Methodology
                      </Link>
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {history.events.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((n) => n + 20)}
                className="mt-3 rounded border border-[var(--bg-elevated)] px-3 py-2"
              >
                Show more changes
              </button>
            )}
          </>
        )}
      </section>
    </details>
  );
}
