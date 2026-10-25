'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import {
  createCloudRegionsLayer,
  type CloudRegionCollection,
  type CloudRegionFeature,
} from './layers/cloud-regions-layer';
import {
  createOppositionLayer,
  type OppositionFightCollection,
  type OppositionFightFeature,
} from './layers/opposition-layer';
import { createCablesLayers, type CableCollection, type CableFeature } from './layers/cables-layer';
import { useAnimationClock, usePrefersReducedMotion } from '@/lib/hooks/use-animation-clock';
import type { CloudProvider } from '@/lib/colors';

type Props = {
  map: MapLibreMap;
  cloudRegions: CloudRegionCollection | null;
  oppositionData: OppositionFightCollection | null;
  cablesData: CableCollection | null;
  cloudProviders: ReadonlySet<CloudProvider>;
  onCloud?: (feature: CloudRegionFeature | null) => void;
  onOpposition?: (feature: OppositionFightFeature | null) => void;
  onCable?: (feature: CableFeature | null) => void;
};

/** Loaded only after a secondary layer is enabled. Animation never rebuilds facility data. */
export function SecondaryOverlays({
  map,
  cloudRegions,
  oppositionData,
  cablesData,
  cloudProviders,
  onCloud,
  onOpposition,
  onCable,
}: Props): null {
  const [overlay, setOverlay] = useState<MapboxOverlay | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const time = useAnimationClock(!!cablesData && !reducedMotion);
  const clouds = useMemo(
    () =>
      cloudRegions
        ? createCloudRegionsLayer(cloudRegions, {
            highlightProviders: cloudProviders,
            onClick: onCloud,
          })
        : null,
    [cloudRegions, cloudProviders, onCloud],
  );
  const opposition = useMemo(
    () =>
      oppositionData ? createOppositionLayer(oppositionData, { onClick: onOpposition }) : null,
    [oppositionData, onOpposition],
  );
  useEffect(() => {
    const instance = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(instance);
    setOverlay(instance);
    return () => {
      map.removeControl(instance);
      setOverlay(null);
    };
  }, [map]);
  useEffect(() => {
    overlay?.setProps({
      layers: [
        clouds,
        ...(cablesData
          ? createCablesLayers(cablesData, { currentTimeMs: time, onClick: onCable })
          : []),
        opposition,
      ],
    });
  }, [overlay, clouds, opposition, cablesData, time, onCable]);
  return null;
}
