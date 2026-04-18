import { CopyButton } from '@/components/copy-button';
import { type ArtifactEntry, formatBytes } from '@/lib/manifest';

/**
 * One row in the Downloads page table. Renders the metadata you'd want
 * before clicking download — size, feature count, last updated, license
 * — plus the two actions: a copy-curl button and a direct link.
 *
 * License posture is rendered inline rather than as an opaque badge:
 * SPEC §4.4 makes us responsible for non-commercial and share-alike
 * disclosure, and a colour-only badge is too easy to miss.
 */
export function ArtifactRow({ artifact }: { artifact: ArtifactEntry }): React.JSX.Element {
  const curl = `curl -L -O ${artifact.r2_url}`;
  const updated = artifact.uploaded_at.slice(0, 10);

  return (
    <li className="border-b border-bg-elevated px-4 py-4 last:border-b-0 md:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-mono text-sm text-text-primary">{artifact.filename}</h3>
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-subtle">
              {artifact.content_type}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            <span className="tabular">{formatBytes(artifact.size_bytes)}</span>
            <span className="mx-2 text-text-subtle">·</span>
            <span className="tabular">{artifact.feature_count.toLocaleString()}</span> features
            <span className="mx-2 text-text-subtle">·</span>
            updated <span className="tabular">{updated}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={curl} label="Copy curl" />
          <a
            href={artifact.r2_url}
            className="rounded bg-accent-focus px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-bg-base transition-opacity hover:opacity-90"
            download
          >
            Download
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-text-muted">
        <span>
          License:{' '}
          <a
            href={artifact.license_url}
            target="_blank"
            rel="noreferrer"
            className="text-text-primary underline decoration-text-subtle underline-offset-2 hover:decoration-text-primary"
          >
            {artifact.license}
          </a>
        </span>
        <span className="text-text-subtle">{artifact.attribution}</span>
      </div>

      {(!artifact.commercial_use || artifact.share_alike) && (
        <div className="mt-2 flex flex-col gap-1 font-mono text-[11px]">
          {!artifact.commercial_use && (
            <p className="font-semibold text-status-blocked">
              Non-commercial use only. Do not redistribute as part of a paid product or service.
            </p>
          )}
          {artifact.share_alike && (
            <p className="text-status-construction">
              Share-alike: derivative datasets must carry the same license.
            </p>
          )}
        </div>
      )}

      <details className="mt-3 font-mono text-[11px] text-text-muted">
        <summary className="cursor-pointer text-text-subtle hover:text-text-muted">
          sha256
        </summary>
        <code className="mt-1 block break-all text-[10px] text-text-muted">
          {artifact.sha256}
        </code>
      </details>
    </li>
  );
}
