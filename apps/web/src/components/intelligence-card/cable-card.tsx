'use client';

import type { CableFeature } from '@/components/map/layers/cables-layer';

export type CableCardProps = {
  feature: CableFeature | null;
  onClose: () => void;
};

/**
 * Format a length in km with thousands separators and a unit suffix.
 * Returns ``null`` so callers can fall back to "unknown" rendering.
 */
function formatKm(n: number | null): string | null {
  if (n == null || Number.isNaN(n)) return null;
  return `${Math.round(n).toLocaleString('en-US')} km`;
}

function formatTbps(n: number | null): string | null {
  if (n == null || Number.isNaN(n)) return null;
  // Tbps numbers are typically in the tens-to-hundreds; one decimal
  // covers the rare fractional case without reading as false precision.
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} Tbps`;
}

/**
 * Compact popover card for submarine-cable clicks. Mirrors the
 * `CloudRegionCard` pattern (small, top-right, dismissible) rather than
 * opening the full IntelligenceCard drawer — cables don't carry the
 * intelligence schema (operators, MW, tenants), so a focused metadata
 * card is the honest UI. Source attribution is mandatory under
 * TeleGeography's CC BY-NC-SA 3.0 license.
 */
export function CableCard({
  feature,
  onClose,
}: CableCardProps): React.JSX.Element | null {
  if (!feature) return null;
  const p = feature.properties;
  const length = formatKm(p.length_km);
  const capacity = formatTbps(p.capacity_tbps);

  return (
    <div
      className="absolute right-4 top-4 z-20 w-80 rounded-md border p-4 font-mono text-xs shadow-lg backdrop-blur"
      style={{
        background: 'color-mix(in oklab, var(--bg-panel) 92%, transparent)',
        borderColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
      role="dialog"
      aria-label={`Submarine cable ${p.name}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--accent-cable)' }}
          />
          <span
            className="text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            submarine cable
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
        {p.name}
      </div>
      <div
        className="mb-3 tabular-nums"
        style={{ color: 'var(--text-muted)' }}
      >
        {length ?? 'length unknown'}
        {p.rfs_year != null && <> · ready for service {p.rfs_year}</>}
        {capacity != null && <> · {capacity}</>}
      </div>

      {p.landing_points.length > 0 && (
        <div className="mb-3">
          <div
            className="mb-1 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            landings ({p.landing_points.length})
          </div>
          {/*
            Cap the visible roster at 8 to keep the card compact;
            transcontinental cables routinely land in 30+ countries
            and we don't want to push the source attribution off-screen.
          */}
          <ul className="flex flex-col gap-0.5">
            {p.landing_points.slice(0, 8).map((lp, i) => (
              <li
                key={`${lp.country}-${lp.name}-${i}`}
                className="flex items-center gap-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <span
                  className="inline-block w-7 text-[10px] tabular-nums"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {lp.country}
                </span>
                <span className="truncate">{lp.name}</span>
              </li>
            ))}
            {p.landing_points.length > 8 && (
              <li
                className="text-[10px]"
                style={{ color: 'var(--text-subtle)' }}
              >
                + {p.landing_points.length - 8} more
              </li>
            )}
          </ul>
        </div>
      )}

      <p
        className="text-[10px] leading-relaxed"
        style={{ color: 'var(--text-subtle)' }}
      >
        © TeleGeography, CC BY-NC-SA 3.0 — non-commercial use only.
      </p>
    </div>
  );
}
