'use client';

import { useState } from 'react';

/**
 * Tiny copy-to-clipboard button used by the /data artifact rows and
 * /data/api endpoint examples. Lives in its own client island so the
 * surrounding pages stay server-rendered.
 *
 * Falls back silently on browsers without `navigator.clipboard` (older
 * Safari over http://). The "Copied" affordance is announced visually
 * for two seconds rather than via aria-live to keep the page quiet for
 * screen readers — the button label itself doesn't change.
 */
export function CopyButton({
  text,
  label = 'Copy',
}: {
  text: string;
  label?: string;
}): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  async function handleClick(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Permissions can deny clipboard write in iframes; ignore.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded border border-bg-elevated px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-text-muted transition-colors hover:border-text-muted hover:text-text-primary"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
