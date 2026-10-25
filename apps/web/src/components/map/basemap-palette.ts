import type { Map } from 'maplibre-gl';

/** Quiet geographic context with readable labels; facility colors stay semantic. */
export function applyBasemapPalette(map: Map, theme: 'dark' | 'light'): void {
  if (theme !== 'dark') return;
  for (const layer of map.getStyle().layers) {
    if (layer.id.startsWith('facility-')) continue;
    if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#121e28');
    if (layer.type === 'fill') {
      const color = /water/i.test(layer.id)
        ? '#09131c'
        : /park|wood|landcover/i.test(layer.id)
          ? '#14232b'
          : '#172630';
      map.setPaintProperty(layer.id, 'fill-color', color);
    }
    if (layer.type === 'line')
      map.setPaintProperty(
        layer.id,
        'line-color',
        /boundary|admin/i.test(layer.id) ? '#2c414e' : '#1d303c',
      );
    if (layer.type === 'symbol') {
      map.setPaintProperty(
        layer.id,
        'text-color',
        /country|state|province/i.test(layer.id) ? '#a2b3c2' : '#7f95a6',
      );
      map.setPaintProperty(layer.id, 'text-halo-color', '#121e28');
    }
  }
}
