import { create } from 'zustand';
import type { LayerId } from '@gigawattmap/types';

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
};

export const useMapStore = create<MapStore>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  setViewport: (next) => set({ viewport: next }),
  selectedLayer: 'datacenters',
  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  selectedDcId: null,
  setSelectedDcId: (id) => set({ selectedDcId: id }),
}));
