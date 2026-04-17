import { create } from 'zustand';
import type { LayerId } from '@gigawattmap/types';
import type { Bbox } from '@/lib/stats';

/** A serializable MapLibre viewport — drives URL persistence and HUD calculations. */
export type Viewport = {
  longitude: number;
  latitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
};

export const DEFAULT_VIEWPORT: Viewport = {
  longitude: -95,
  latitude: 38,
  zoom: 3.2,
  bearing: 0,
  pitch: 0,
};

type MapStore = {
  viewport: Viewport;
  setViewport: (next: Viewport) => void;
  /** The layer the user is actively focused on (drives HUD emphasis). */
  selectedLayer: LayerId;
  setSelectedLayer: (layer: LayerId) => void;
  /**
   * Currently focused datacenter id, or null when nothing is selected.
   * Source of truth is the `?dc=` URL param; the URL-sync hook keeps this
   * mirror in step so non-React consumers (the map's WebGL layer) can read
   * it without subscribing to Next.js routing primitives.
   */
  selectedDcId: string | null;
  setSelectedDcId: (id: string | null) => void;
  /** Viewport HUD collapse state. Persisted only for the lifetime of the tab. */
  hudCollapsed: boolean;
  setHudCollapsed: (next: boolean) => void;
  /**
   * Geographic bounds of the visible map, pushed by the `Map` component on
   * `moveend`. `null` until the map mounts and emits its first event. The
   * HUD reads this to filter features client-side.
   */
  visibleBbox: Bbox | null;
  setVisibleBbox: (next: Bbox) => void;
  /**
   * Per-layer visibility. Only `datacenters` is wired to a real WebGL layer
   * in v1; the rest are placeholders surfaced in the layer-controls panel
   * so visitors can see what's coming. The map reads `layers.datacenters`
   * to drive deck.gl visibility; placeholder toggles never mutate this map
   * (their UI shows a transient "coming in v1" hint instead).
   */
  layers: Record<LayerId, boolean>;
  setLayerVisible: (id: LayerId, next: boolean) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  setViewport: (next) => set({ viewport: next }),
  selectedLayer: 'datacenters',
  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  selectedDcId: null,
  setSelectedDcId: (id) => set({ selectedDcId: id }),
  hudCollapsed: false,
  setHudCollapsed: (next) => set({ hudCollapsed: next }),
  visibleBbox: null,
  setVisibleBbox: (next) => set({ visibleBbox: next }),
  layers: {
    datacenters: true,
    cables: false,
    powerplants: false,
    opposition: false,
    cloud_regions: false,
    water_stress: false,
  },
  setLayerVisible: (id, next) =>
    set((state) => ({ layers: { ...state.layers, [id]: next } })),
}));
