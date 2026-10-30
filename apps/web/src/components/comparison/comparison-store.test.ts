import { beforeEach, expect, it } from 'vitest';
import { useComparisonStore } from './comparison-store';
beforeEach(() => useComparisonStore.getState().clear());
it('keeps three distinct facilities and permits replacing a removed selection', () => {
  const s = useComparisonStore.getState();
  for (const id of ['', 'a', 'a', 'b', 'c', 'd']) s.add(id);
  expect(useComparisonStore.getState().ids).toEqual(['a', 'b', 'c']);
  s.remove('b');
  s.add('d');
  expect(useComparisonStore.getState().ids).toEqual(['a', 'c', 'd']);
  s.clear();
  expect(useComparisonStore.getState().ids).toEqual([]);
});
