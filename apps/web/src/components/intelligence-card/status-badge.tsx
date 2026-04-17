import type { DatacenterStatus } from '@gigawattmap/types';
import { cn } from '@/lib/cn';

const LABEL: Record<DatacenterStatus, string> = {
  operational: 'Operational',
  construction: 'Under Construction',
  announced: 'Announced',
  blocked: 'Blocked',
};

/**
 * Status pill. Colors come from the `--status-*` CSS variables defined in
 * globals.css (mirrors SPEC §5). Border uses currentColor so the pill reads
 * crisp against any panel background.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: DatacenterStatus;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
        className,
      )}
      style={{ color: `var(--status-${status})`, borderColor: 'currentColor' }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: 'currentColor' }}
      />
      {LABEL[status]}
    </span>
  );
}
