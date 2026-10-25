import type { FeatureCollection, Point } from 'geojson';
import type { AiCampusCollection, AiCampusProperties } from './layers/datacenters-layer';
import type { CircleLayerSpecification, ExpressionSpecification } from 'maplibre-gl';

export const FACILITIES_SOURCE = 'facilities';
export const CLUSTERS_LAYER = 'facility-clusters';
export const POINTS_LAYER = 'facility-points';
export const COUNTS_LAYER = 'facility-counts';

type RenderProperties = AiCampusProperties & { matched: number };
export type RenderFacilities = FeatureCollection<Point, RenderProperties>;

/** Keep source geometry stable; carry one numeric flag for cluster aggregation. */
export function prepareFacilities(
  data: AiCampusCollection,
  operators: ReadonlySet<string>,
): RenderFacilities {
  return {
    type: 'FeatureCollection',
    features: data.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        matched: Number(
          operators.size === 0 ||
            operators.has(feature.properties.operator) ||
            (feature.properties.operator_id !== null &&
              feature.properties.operator_id !== undefined &&
              operators.has(feature.properties.operator_id)),
        ),
      },
    })),
  };
}

export const FACILITY_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'tier'],
  'hyperscale',
  '#ffb74d',
  'colo',
  '#64b5f6',
  'neocloud',
  '#ba68c8',
  '#78909c',
];

export function pointPaint(selectedId: string | null): CircleLayerSpecification['paint'] {
  const selected: ExpressionSpecification = ['==', ['get', 'id'], selectedId ?? ''];
  return {
    'circle-color': FACILITY_COLOR,
    'circle-radius': [
      'min',
      22,
      ['max', 5, ['*', ['sqrt', ['max', 0, ['coalesce', ['get', 'est_mw_mid'], 0]]], 0.45]],
    ],
    'circle-opacity': ['case', ['>', ['get', 'matched'], 0], 1, 0.2],
    'circle-stroke-color': ['case', selected, '#6edbd5', '#0a0d12'],
    'circle-stroke-width': ['case', selected, 3, 1],
    'circle-stroke-opacity': ['case', ['>', ['get', 'matched'], 0], 0.9, 0.2],
  };
}
