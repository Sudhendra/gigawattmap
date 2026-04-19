'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Copy, Download, Linkedin, Twitter, X } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/env';
import { cn } from '@/lib/cn';
import {
  buildLinkedInIntent,
  buildOgImageUrl,
  buildTweetIntent,
  type CampusForShare,
} from './share-templates';

type ShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campus: CampusForShare;
  /** Absolute share URL (deep link with `?dc=<id>`). */
  shareUrl: string;
};

/**
 * Centered share dialog with four actions: copy link, tweet, share to
 * LinkedIn, download the OG PNG. Built on Radix Dialog so focus trap,
 * Esc-to-close, and overlay-click-to-close behave correctly. Title is
 * `sr-only` because the visible header is the campus name itself —
 * Radix still requires a `Dialog.Title` for screen readers (a11y rule).
 */
export function ShareModal({
  open,
  onOpenChange,
  campus,
  shareUrl,
}: ShareModalProps): React.JSX.Element {
  const tweetUrl = buildTweetIntent(campus, shareUrl);
  const linkedInUrl = buildLinkedInIntent(shareUrl);
  const ogUrl = buildOgImageUrl(campus.id, API_BASE);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-[var(--bg-elevated)] bg-[var(--bg-panel)] text-[var(--text-primary)]',
            'shadow-[0_20px_60px_rgba(0,0,0,0.6)] focus:outline-none',
          )}
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Share {campus.name}</Dialog.Title>

          <header className="flex items-start justify-between gap-3 border-b border-[var(--bg-elevated)] px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
                Share
              </p>
              <h3 className="mt-0.5 truncate font-display text-[15px] font-semibold uppercase tracking-[0.08em] text-[var(--text-primary)]">
                {campus.name}
              </h3>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-focus)]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="grid grid-cols-2 gap-2 p-4">
            <ActionButton onClick={() => void handleCopy()} icon={<Copy className="h-4 w-4" />}>
              Copy link
            </ActionButton>
            <ActionLink href={tweetUrl} icon={<Twitter className="h-4 w-4" />}>
              Post on X
            </ActionLink>
            <ActionLink href={linkedInUrl} icon={<Linkedin className="h-4 w-4" />}>
              Share on LinkedIn
            </ActionLink>
            <ActionLink
              href={ogUrl}
              icon={<Download className="h-4 w-4" />}
              download={`${campus.id}.png`}
            >
              Download PNG
            </ActionLink>
          </div>

          <p className="border-t border-[var(--bg-elevated)] px-5 py-3 text-[10px] leading-relaxed text-[var(--text-subtle)]">
            Preview unfurls with a generated card image. Twitter/X and LinkedIn
            fetch it from the shared URL automatically.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ActionButton({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded border border-[var(--bg-elevated)] bg-[var(--bg-base)]/40 px-3 py-2 text-xs',
        'text-[var(--text-primary)] transition hover:border-[var(--accent-focus)] hover:bg-[var(--bg-elevated)]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-focus)]',
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function ActionLink({
  href,
  icon,
  children,
  download,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  download?: string;
}): React.JSX.Element {
  // Download links stay same-tab (browser handles attachment); social intents
  // open in a new tab so the user keeps the map context.
  const isDownload = typeof download === 'string';
  return (
    <a
      href={href}
      {...(isDownload
        ? { download }
        : { target: '_blank', rel: 'noreferrer noopener' })}
      className={cn(
        'flex items-center gap-2 rounded border border-[var(--bg-elevated)] bg-[var(--bg-base)]/40 px-3 py-2 text-xs',
        'text-[var(--text-primary)] transition hover:border-[var(--accent-focus)] hover:bg-[var(--bg-elevated)]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-focus)]',
      )}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}
