'use client';

import { useEffect, useState } from 'react';
import { useMapStore } from '@/lib/store/map-store';
import { cn } from '@/lib/cn';

/**
 * Tiny ⌘K hint button. Sits in the header, opens the command palette on
 * click, and renders the platform-correct modifier symbol on mount so SSR
 * never ships the wrong glyph for non-Mac visitors.
 */
export function CmdkHintButton(): React.JSX.Element {
  const setCmdkOpen = useMapStore((s) => s.setCmdkOpen);
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);
  return (
    <button
      type="button"
      onClick={() => setCmdkOpen(true)}
      title="Search (press ⌘K or Ctrl+K)"
      className={cn(
        'flex items-center gap-1.5 rounded border border-white/10 px-2 py-1',
        'font-mono text-[10px] uppercase tracking-widest text-text-muted',
        'transition-colors hover:border-white/20 hover:text-text-primary',
      )}
    >
      <span>Search</span>
      <kbd className="font-mono text-[10px]">{isMac ? '⌘' : 'Ctrl'}K</kbd>
    </button>
  );
}
