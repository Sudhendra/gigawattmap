import Link from 'next/link';
import { cn } from '@/lib/cn';
import { CmdkHintButton } from './cmdk-hint-button';

const NAV = [
  { href: '/', label: 'Map' },
  { href: '/news', label: 'News' },
  { href: '/data', label: 'Data' },
  { href: '/about', label: 'About' },
] as const;

/**
 * Persistent top header. Wordmark is text-only (SPEC §5: editorial cartography),
 * "GIGAWATT MAP" set in JetBrains Mono with letter-spacing.
 */
export function AppHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-bg-base/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center justify-between gap-2 px-2 sm:px-4">
        <Link
          href="/"
          className={cn(
            'whitespace-nowrap font-mono text-[10px] font-semibold tracking-wide sm:text-sm sm:tracking-[0.2em] text-text-primary',
            'transition-opacity hover:opacity-80',
          )}
        >
          GIGAWATT MAP
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-[10px] uppercase tracking-normal sm:text-xs sm:tracking-widest text-text-muted transition-colors hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
          <CmdkHintButton />
        </nav>
      </div>
    </header>
  );
}
