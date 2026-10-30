'use client';
import { COMPARISON_LIMIT, useComparisonStore } from './comparison-store';
export function CompareButton({ id }: { id: string }): React.JSX.Element {
  const { ids, add, remove } = useComparisonStore();
  const selected = ids.includes(id),
    full = ids.length >= COMPARISON_LIMIT;
  return (
    <button
      className="workspace-button"
      aria-pressed={selected}
      disabled={!selected && full}
      onClick={() => (selected ? remove(id) : add(id))}
    >
      {selected ? 'Remove from comparison' : full ? 'Comparison full (3/3)' : 'Add to comparison'}
    </button>
  );
}
