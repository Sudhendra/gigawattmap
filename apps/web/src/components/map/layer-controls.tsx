'use client';

import { useEffect, useRef, useState } from 'react';
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
 * v1 controls. Three of these are deliberately stubs — surfacing them
 * communicates that the project is intentionally a v1 with more layers in
 * flight, rather than a finished single-purpose tool. When clicked they
 * flash a transient "coming in v1" hint instead of toggling state.
 */
const LAYERS: readonly LayerControl[] = [
  { id: 'datacenters', label: 'Datacenters', swatch: 'var(--dc-hyperscale)', placeholder: false },
  {
    id: 'cloud_regions',
    label: 'Cloud regions',
    // Mixed-provider gradient communicates the layer carries multiple
    // brands without privileging any single one.
    swatch:
      'linear-gradient(135deg, var(--cloud-aws), var(--cloud-azure), var(--cloud-gcp))',
    placeholder: false,
  },
  { id: 'cables', label: 'Cables', swatch: 'var(--accent-cable)', placeholder: true },
  { id: 'powerplants', label: 'Power plants', swatch: 'var(--fuel-gas)', placeholder: true },
  { id: 'opposition', label: 'Opposition', swatch: 'var(--status-blocked)', placeholder: false },
];

const HINT_DURATION_MS = 2_000;

/**
 * Top-left floating panel. Reads layer visibility from `mapStore` and writes
 * back through `setLayerVisible` for real layers; for placeholders it only
 * displays a 2s "coming in v1" hint so visitors get explicit feedback that
 * the toggle was understood but the layer isn't ready.
 */
export function LayerControls(): React.JSX.Element {
  const layers = useMapStore((s) => s.layers);
  const setLayerVisible = useMapStore((s) => s.setLayerVisible);

  // Which placeholder is currently flashing its "coming in v1" hint, if any.
  // We track a single id rather than per-layer booleans because only one
  // hint is ever active at a time and it auto-clears.
  const [hintFor, setHintFor] = useState<LayerId | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  function handleToggle(layer: LayerControl): void {
    if (layer.placeholder) {
      setHintFor(layer.id);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintFor(null), HINT_DURATION_MS);
      return;
    }
    setLayerVisible(layer.id, !layers[layer.id]);
  }

  return (
    <div
      className="absolute left-4 top-4 z-10 w-56 rounded-md border p-2 font-mono text-xs shadow-lg backdrop-blur"
      style={{
        background: 'color-mix(in oklab, var(--bg-panel) 88%, transparent)',
        borderColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
      role="group"
      aria-label="Map layers"
    >
      <ul className="flex flex-col gap-1">
        {LAYERS.map((layer) => {
          const checked = layers[layer.id];
          const showHint = hintFor === layer.id;
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
                  onChange={() => handleToggle(layer)}
                  className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent-focus)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]"
                  aria-describedby={showHint ? `layer-hint-${layer.id}` : undefined}
                />
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: layer.swatch }}
                />
                <span className="flex-1">{layer.label}</span>
              </label>
              {showHint && (
                <span
                  id={`layer-hint-${layer.id}`}
                  role="status"
                  aria-live="polite"
                  className="ml-7 text-[10px]"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  coming in v1
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
