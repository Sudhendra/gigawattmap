'use client';

import type { CloudRegionFeature } from '@/components/map/layers/cloud-regions-layer';

const PROVIDER_LABELS: Record<string, string> = {
  aws: 'Amazon Web Services',
  azure: 'Microsoft Azure',
  gcp: 'Google Cloud',
  oracle: 'Oracle Cloud',
  alibaba: 'Alibaba Cloud',
};

const PROVIDER_TOKEN: Record<string, string> = {
  aws: 'var(--cloud-aws)',
  azure: 'var(--cloud-azure)',
  gcp: 'var(--cloud-gcp)',
  oracle: 'var(--cloud-oracle)',
  alibaba: 'var(--cloud-alibaba)',
};

export type CloudRegionCardProps = {
  feature: CloudRegionFeature | null;
  onClose: () => void;
};

/**
 * Small popover card for cloud-region clicks. Deliberately separate from
 * the full IntelligenceCard drawer — cloud regions don't have the same
 * intelligence schema (operators, MW, tenants); they're metro-level
 * markers, so a compact card is the honest UI.
 *
 * The card explicitly states the centroid is approximate so users can't
 * mistake it for a precise datacenter location.
 */
export function CloudRegionCard({
  feature,
  onClose,
}: CloudRegionCardProps): React.JSX.Element | null {
  if (!feature) return null;
  const p = feature.properties;
  const providerLabel = PROVIDER_LABELS[p.provider] ?? p.provider;
  const providerColor = PROVIDER_TOKEN[p.provider] ?? 'var(--text-muted)';

  return (
    <div
      className="absolute right-4 top-4 z-20 w-80 rounded-md border p-4 font-mono text-xs shadow-lg backdrop-blur"
      style={{
        background: 'color-mix(in oklab, var(--bg-panel) 92%, transparent)',
        borderColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
      role="dialog"
      aria-label={`${providerLabel} ${p.code} region`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: providerColor }}
          />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {providerLabel}
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

      <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {p.display_name}
      </div>
      <div className="mb-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {p.code} · {p.country}
        {p.launch_year != null && <> · launched {p.launch_year}</>}
      </div>

      {p.services && p.services.length > 0 && (
        <div className="mb-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-subtle)' }}>
            services
          </div>
          <div className="flex flex-wrap gap-1">
            {p.services.map((s) => (
              <span
                key={s}
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <p
        className="mb-3 text-[10px] leading-relaxed"
        style={{ color: 'var(--text-subtle)' }}
      >
        Approximate metro-area centroid. Cloud providers do not publish
        exact datacenter coordinates.
      </p>

      <a
        href={p.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] underline decoration-dotted underline-offset-2"
        style={{ color: 'var(--accent-focus)' }}
      >
        provider region docs ↗
      </a>
    </div>
  );
}
