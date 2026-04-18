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
  /**
   * Operator slug the user has filtered the map by (driven by the Cmd+K
   * palette), or null when no filter is active. Source of truth is the
   * `?operator=` URL param; the URL-sync hook keeps this mirror in step so
   * the WebGL layer can read it cheaply. Composes with `tickerFilter`: when
   * either is set, matching operators stay lit and the rest dim.
   */
  operatorFilter: string | null;
  setOperatorFilter: (id: string | null) => void;
  /**
   * Whether the Cmd+K command palette is open. Lives in the store so the
   * keyboard shortcut handler in <MapView/>, the hint button in <AppHeader/>,
   * and the <CommandPalette/> overlay all stay in sync without prop drilling.
   */
  cmdkOpen: boolean;
  setCmdkOpen: (next: boolean) => void;
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
  /**
   * Stock symbol the user has filtered the map by, or null when no filter
   * is active. Mapped to operators / cloud providers via `lib/ticker-map.ts`;
   * matching features render at full opacity, others fade. Lives in the
   * store rather than the URL so deep-linking stays focused on geography.
   */
  tickerFilter: string | null;
  setTickerFilter: (symbol: string | null) => void;
  /**
   * Whether the ticker panel is in its slim collapsed strip state. Persisted
   * for the lifetime of the tab via sessionStorage so a casual visitor isn't
   * pestered with the full panel after they hide it.
   */
  tickerPanelCollapsed: boolean;
  setTickerPanelCollapsed: (next: boolean) => void;
};

/**
 * sessionStorage-backed seed for `tickerPanelCollapsed`. Returns false during
 * SSR or when the storage call fails (private mode, quota, etc.) so the
 * panel always defaults to "expanded" on first paint.
 */
function readPersistedCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem('gwm.tickerPanelCollapsed') === '1';
  } catch {
    return false;
  }
}

function writePersistedCollapsed(next: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem('gwm.tickerPanelCollapsed', next ? '1' : '0');
  } catch {
    // Best-effort: a failed write should never break interaction.
  }
}

export const useMapStore = create<MapStore>((set) => ({
  viewport: DEFAULT_VIEWPORT,
  setViewport: (next) => set({ viewport: next }),
  selectedLayer: 'datacenters',
  setSelectedLayer: (layer) => set({ selectedLayer: layer }),
  selectedDcId: null,
  setSelectedDcId: (id) => set({ selectedDcId: id }),
  operatorFilter: null,
  setOperatorFilter: (id) => set({ operatorFilter: id }),
  cmdkOpen: false,
  setCmdkOpen: (next) => set({ cmdkOpen: next }),
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
  tickerFilter: null,
  setTickerFilter: (symbol) => set({ tickerFilter: symbol }),
  tickerPanelCollapsed: readPersistedCollapsed(),
  setTickerPanelCollapsed: (next) => {
    writePersistedCollapsed(next);
    set({ tickerPanelCollapsed: next });
  },
}));
