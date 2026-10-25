import { afterEach, expect, it, vi } from 'vitest';
import { replaceMapSelection } from './map-selection-url';

afterEach(() => vi.unstubAllGlobals());
it('updates client URL state without navigation and preserves unrelated parameters and hash', () => {
  const location = { href: 'https://gigawattmap.com/?operator=equinix&x=1#map' };
  const replaceState = vi.fn((_state: unknown, _title: string, path: string) => {
    location.href = new URL(path, location.href).href;
  });
  vi.stubGlobal('window', { location, history: { replaceState } });
  replaceMapSelection('operator', null);
  replaceMapSelection('dc', 'site a');
  expect(location.href).toBe('https://gigawattmap.com/?x=1&dc=site+a#map');
  expect(replaceState).toHaveBeenCalledTimes(2);
  replaceMapSelection('dc', 'site a');
  expect(replaceState).toHaveBeenCalledTimes(2);
  replaceMapSelection('operator', 'amazon');
  expect(location.href).toBe('https://gigawattmap.com/?x=1&operator=amazon#map');
});
it('is safe during server rendering', () => {
  vi.stubGlobal('window', undefined);
  expect(() => replaceMapSelection('dc', 'site')).not.toThrow();
});
