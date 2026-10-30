'use client';
import { COMPARISON_LIMIT, useComparisonStore } from './comparison-store';
export function CompareButton({ id }: { id: string }): React.JSX.Element {
  const { ids, add, remove } = useComparisonStore();
  const selected = ids.includes(id),
    full = ids.length >= COMPARISON_LIMIT;
  return (
    <button
      className="workspace-button"
      title={
        selected
          ? 'Remove this facility from your comparison'
          : full
            ? 'Remove a facility from the comparison tray to make room'
            : 'Compare this facility with up to two others'
      }
      aria-pressed={selected}
      disabled={!selected && full}
      onClick={() => (selected ? remove(id) : add(id))}
    >
      {selected
        ? '✓ Added to comparison · Remove'
        : full
          ? 'Comparison full (3/3)'
          : 'Add to comparison'}
    </button>
  );
}
