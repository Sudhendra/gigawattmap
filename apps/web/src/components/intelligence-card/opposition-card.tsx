'use client';

import type { OppositionFightFeature } from '@/components/map/layers/opposition-layer';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  approved: 'Approved',
  approved_with_conditions: 'Approved (conditional)',
  defeated: 'Defeated',
  delayed: 'Delayed',
  expired: 'Moratorium expired',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
  settled: 'Settled',
  unknown: 'Status unknown',
};

const OUTCOME_LABEL: Record<string, string> = {
  win: 'Community win',
  loss: 'Community loss',
  partial: 'Partial outcome',
  ongoing: 'Ongoing',
  unknown: 'Outcome unknown',
};

/**
 * Status colors hand-mapped from SPEC §5. We deliberately don't re-use
 * the datacenter ``StatusBadge`` because opposition statuses are a
 * different vocabulary (community-edited, ~10 values vs the 4-value
 * ``DatacenterStatus`` literal) and forcing a shared component would
 * mean introducing wrong intermediate states on either side.
 */
const STATUS_COLOR: Record<string, string> = {
  defeated: 'var(--status-blocked)', // community win = project blocked
  blocked: 'var(--status-blocked)',
  cancelled: 'var(--status-blocked)',
  withdrawn: 'var(--status-blocked)',
  active: 'var(--accent-warm)',
  delayed: 'var(--accent-warm)',
  expired: 'var(--text-muted)',
  approved: 'var(--status-operational)',
  approved_with_conditions: 'var(--status-operational)',
  settled: 'var(--text-muted)',
  unknown: 'var(--text-muted)',
};

function formatHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export type OppositionCardProps = {
  feature: OppositionFightFeature | null;
  onClose: () => void;
};

/**
 * Compact card for opposition-fight clicks. Deliberately separate from
 * the datacenter Intelligence Card: opposition fights have a different
 * schema (status vocabulary, opposition_groups, multiple primary
 * sources, geocode confidence) and trying to share one drawer would
 * mean rendering empty sections in both directions.
 *
 * Surfaces every primary source URL — per AGENTS.md the audit trail
 * must be visible to the reader, not just present in the data file.
 */
export function OppositionCard({
  feature,
  onClose,
}: OppositionCardProps): React.JSX.Element | null {
  if (!feature) return null;
  const p = feature.properties;
  const statusKey = p.status in STATUS_LABEL ? p.status : 'unknown';
  const outcomeKey =
    p.community_outcome in OUTCOME_LABEL ? p.community_outcome : 'unknown';
  const statusColor = STATUS_COLOR[statusKey] ?? 'var(--text-muted)';
  const title = p.project_name ?? p.jurisdiction;
  const subtitleParts = [p.county, p.state].filter(Boolean);
  const showGeocodeWarning =
    p.geocode_confidence === 'low' || p.geocode_confidence === 'medium';

  return (
    <div
      className="absolute right-4 top-4 z-20 w-96 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-md border p-4 font-mono text-xs shadow-lg backdrop-blur"
      style={{
        background: 'color-mix(in oklab, var(--bg-panel) 92%, transparent)',
        borderColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
      role="dialog"
      aria-label={`Opposition fight: ${title}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="text-[14px] font-bold leading-none"
            style={{ color: 'var(--status-blocked)' }}
          >
            {'\u2715'}
          </span>
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            Community opposition
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded px-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          ×
        </button>
      </div>

      <div
        className="mb-1 text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </div>
      {subtitleParts.length > 0 && (
        <div className="mb-3" style={{ color: 'var(--text-muted)' }}>
          {subtitleParts.join(', ')}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ color: statusColor, borderColor: 'currentColor' }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'currentColor' }}
          />
          {STATUS_LABEL[statusKey]}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-muted)',
          }}
        >
          {OUTCOME_LABEL[outcomeKey]}
        </span>
      </div>

      {(p.company || p.hyperscaler) && (
        <div className="mb-3" style={{ color: 'var(--text-muted)' }}>
          {p.company ?? p.hyperscaler}
          {p.company && p.hyperscaler && p.company !== p.hyperscaler && (
            <> · {p.hyperscaler}</>
          )}
        </div>
      )}

      {(p.megawatts != null || p.investment_million_usd != null) && (
        <div className="mb-3 flex gap-4 tabular-nums">
          {p.megawatts != null && (
            <div>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-subtle)' }}
              >
                scope
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                {p.megawatts.toLocaleString()} MW
              </div>
            </div>
          )}
          {p.investment_million_usd != null && (
            <div>
              <div
                className="text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-subtle)' }}
              >
                investment
              </div>
              <div style={{ color: 'var(--text-primary)' }}>
                ${p.investment_million_usd.toLocaleString()}M
              </div>
            </div>
          )}
        </div>
      )}

      {p.summary && (
        <p
          className="mb-3 leading-relaxed"
          style={{ color: 'var(--text-primary)' }}
        >
          {p.summary}
        </p>
      )}

      {p.opposition_groups.length > 0 && (
        <div className="mb-3">
          <div
            className="mb-1 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            opposition groups
          </div>
          <ul className="flex flex-wrap gap-1">
            {p.opposition_groups.map((g) => (
              <li
                key={g}
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                }}
              >
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.issue_category.length > 0 && (
        <div className="mb-3">
          <div
            className="mb-1 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            concerns
          </div>
          <div className="flex flex-wrap gap-1">
            {p.issue_category.map((c) => (
              <span
                key={c}
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-muted)',
                }}
              >
                {c.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {p.sources.length > 0 && (
        <div className="mb-3">
          <div
            className="mb-1 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            sources ({p.sources.length})
          </div>
          <ul className="flex flex-col gap-0.5">
            {p.sources.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] underline decoration-dotted underline-offset-2"
                  style={{ color: 'var(--accent-focus)' }}
                >
                  {formatHostname(url)} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showGeocodeWarning && (
        <p
          className="mb-3 text-[10px] leading-relaxed"
          style={{ color: 'var(--accent-warm)' }}
        >
          Approximate location ({p.geocode_confidence} confidence) — may
          show a city or county centroid rather than the exact site.
        </p>
      )}

      <p
        className="text-[10px] leading-relaxed"
        style={{ color: 'var(--text-subtle)' }}
      >
        Data: datacenter-opposition-tracker (CC BY 4.0), compiled from
        Data Center Watch, Robert Bryce, FracTracker Alliance, and local
        news. Aggregator: {p.data_source}.
      </p>
    </div>
  );
}
