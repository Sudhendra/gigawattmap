import { cn } from '@/lib/cn';

export type FieldRowProps = {
  label: string;
  /** Optional source URL — when present, the value gains an underline-on-hover affordance and links out. */
  source?: string | undefined;
  /** Tabular-numeric formatting for any numeric value. */
  numeric?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Key/value row used throughout the Intelligence Card. Signature move: when a
 * source URL is provided, the value is wrapped in an anchor that reveals an
 * underline on hover/focus — making provenance discoverable without
 * cluttering the resting state.
 */
export function FieldRow({
  label,
  source,
  numeric = false,
  className,
  children,
}: FieldRowProps): React.JSX.Element {
  const valueClass = cn(
    'text-[var(--text-primary)] text-sm leading-snug',
    numeric && 'tabular',
  );

  return (
    <div className={cn('grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-1.5', className)}>
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-subtle)]">
        {label}
      </dt>
      <dd className={valueClass}>
        {source ? (
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="decoration-[var(--text-subtle)] underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {children}
          </a>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
