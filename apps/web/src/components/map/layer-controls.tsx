'use client';

import type { LayerId } from '@gigawattmap/types';
import { useMapStore } from '@/lib/store/map-store';

type LayerControl = {
  id: LayerId;
  label: string;
  /** CSS variable expression for the swatch fill. */
  swatch: string;
  /** Real layers wire into the WebGL overlay; placeholders only flash a hint. */
  placeholder: boolean;
};

/**
 * Available infrastructure layers. Planned datasets remain visibly disabled.
 */
const LAYERS: readonly LayerControl[] = [
  { id: 'datacenters', label: 'Datacenters', swatch: 'var(--dc-hyperscale)', placeholder: false },
  {
    id: 'cloud_regions',
    label: 'Cloud regions',
    // Mixed-provider gradient communicates the layer carries multiple
    // brands without privileging any single one.
    swatch: 'linear-gradient(135deg, var(--cloud-aws), var(--cloud-azure), var(--cloud-gcp))',
    placeholder: false,
  },
  { id: 'cables', label: 'Cables', swatch: 'var(--accent-cable)', placeholder: false },
  { id: 'powerplants', label: 'Power plants', swatch: 'var(--fuel-gas)', placeholder: true },
  { id: 'opposition', label: 'Opposition', swatch: 'var(--status-blocked)', placeholder: false },
];

/** Layer controls live in the research panel; unavailable datasets stay disabled. */
export function LayerControls(): React.JSX.Element {
  const layers = useMapStore((s) => s.layers);
  const setLayerVisible = useMapStore((s) => s.setLayerVisible);

  function handleToggle(layer: LayerControl): void {
    if (!layer.placeholder) setLayerVisible(layer.id, !layers[layer.id]);
  }

  return (
    <div
      className="m-4 rounded-lg border p-3 text-sm"
      style={{
        background: 'color-mix(in oklab, var(--bg-panel) 88%, transparent)',
        borderColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
      role="group"
      aria-label="Map layers"
    >
      <ul className="flex flex-col gap-3">
        {LAYERS.map((layer) => {
          const checked = layers[layer.id];
          return (
            <li key={layer.id} className="flex flex-col">
              <label
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-[var(--bg-elevated)]"
                style={{
                  color: layer.placeholder ? 'var(--text-muted)' : 'var(--text-primary)',
                }}
              >
                <input
                  type="checkbox"
                  // Placeholders show as unchecked because their state never
                  // flips. Real layers reflect store state.
                  checked={layer.placeholder ? false : checked}
                  disabled={layer.placeholder}
                  onChange={() => handleToggle(layer)}
                  className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-focus)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
                />
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: layer.swatch }}
                />
                <span className="flex-1">{layer.label}</span>
                {layer.placeholder && <span className="text-[10px] text-text-muted">Planned</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-text-muted">
        Facilities: © OpenStreetMap contributors (ODbL) and curated campuses. Cloud regions and
        opposition: curated coverage. Cables: TeleGeography (CC BY-NC-SA 3.0, noncommercial).
      </p>
      <a href="/about" className="mt-3 inline-block text-xs text-[var(--accent-focus)]">
        Sources & methodology ↗
      </a>
    </div>
  );
}
