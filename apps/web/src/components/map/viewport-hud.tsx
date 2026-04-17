'use client';

import { useMemo } from 'react';
import { useMapStore } from '@/lib/store/map-store';
import { computeViewportStats, type ViewportStats } from '@/lib/stats';
import type { AiCampusCollection } from './layers/datacenters-layer';

export type ViewportHudProps = {
  /** The full AI-campus collection. The HUD filters to the current bbox. */
  data: AiCampusCollection | null;
};

/** Stat shown when no data has loaded or no bbox is known yet. */
const PLACEHOLDER: ViewportStats = { dcCount: 0, totalMw: 0, operatorCount: 0 };

/**
 * Format MW as gigawatts with one decimal. We label the unit explicitly
 * (`GW`) and keep the leading `~` to communicate that totals are estimates
 * — every datacenter MW figure is an interval, and we sum the midpoints.
 */
function formatGw(mw: number): string {
  if (!Number.isFinite(mw) || mw <= 0) return '0.0';
  return (mw / 1000).toFixed(1);
}

/**
 * Bottom-centered status strip. Reads `visibleBbox` from the store (pushed
 * by the `Map` component on `moveend`) and the in-memory feature collection
 * from the parent. Updates only on `moveend`, never per frame, because the
 * store mutation that drives this component is itself debounced by
 * MapLibre's event model.
 */
export function ViewportHud({ data }: ViewportHudProps): React.JSX.Element {
  const visibleBbox = useMapStore((s) => s.visibleBbox);
  const collapsed = useMapStore((s) => s.hudCollapsed);
  const setCollapsed = useMapStore((s) => s.setHudCollapsed);

  const stats = useMemo<ViewportStats>(() => {
    if (!data || !visibleBbox) return PLACEHOLDER;
    return computeViewportStats(data.features, visibleBbox);
  }, [data, visibleBbox]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center"
      // The wrapper is non-interactive so map gestures pass through; the
      // pill itself re-enables pointer events.
    >
      <div
        className="pointer-events-auto flex max-w-[60%] items-center gap-3 rounded-full border px-4 py-2 font-mono text-xs shadow-lg backdrop-blur"
        style={{
          background: 'color-mix(in oklab, var(--bg-panel) 88%, transparent)',
          borderColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-controls="viewport-hud-stats"
          aria-label={collapsed ? 'Expand viewport stats' : 'Collapse viewport stats'}
          className="grid h-5 w-5 place-items-center rounded text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
        >
          <Chevron collapsed={collapsed} />
        </button>

        {!collapsed && (
          <div
            id="viewport-hud-stats"
            aria-live="polite"
            aria-atomic="true"
            className="tabular flex items-center gap-3 whitespace-nowrap"
          >
            <Stat
              label="Visible"
              value={`${stats.dcCount.toLocaleString()} DCs`}
              tooltip="Datacenters whose marker falls inside the current map view."
            />
            <Divider />
            <Stat
              label=""
              value={`~${formatGw(stats.totalMw)} GW est`}
              tooltip="Sum of midpoint power estimates across visible datacenters. Estimates are intervals; this is the central value."
            />
            <Divider />
            <Stat
              label=""
              value={`${stats.operatorCount.toLocaleString()} operators`}
              tooltip="Distinct owner-operators among visible datacenters."
            />
            <Divider />
            <Stat
              label=""
              value="— substations"
              tooltip="Substation layer ships in a later milestone."
              muted
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tooltip,
  muted = false,
}: {
  label: string;
  value: string;
  tooltip: string;
  muted?: boolean;
}): React.JSX.Element {
  return (
    <span
      className="cursor-help"
      style={{ color: muted ? 'var(--text-subtle)' : undefined }}
      title={tooltip}
    >
      {label ? <span className="text-[var(--text-muted)]">{label}: </span> : null}
      {value}
    </span>
  );
}

function Divider(): React.JSX.Element {
  return <span aria-hidden className="text-[var(--text-subtle)]">·</span>;
}

function Chevron({ collapsed }: { collapsed: boolean }): React.JSX.Element {
  // Rotates 180° when collapsed so the affordance points "open".
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      className="transition-transform motion-reduce:transition-none"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
      aria-hidden
    >
      <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
