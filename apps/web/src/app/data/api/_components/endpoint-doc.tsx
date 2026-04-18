/**
 * One documented endpoint block on the API docs page. Server component;
 * the only interactive island is the copy button on the example curl.
 *
 * The example response is rendered as a pre-formatted JSON string the
 * caller hand-writes — keeping it short and curated is more useful than
 * dumping the live response shape, which can be 50 KB.
 */

import { CopyButton } from '@/components/copy-button';

export type EndpointParam = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
};

export type Endpoint = {
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  description: string;
  params?: EndpointParam[];
  exampleCurl: string;
  exampleResponse: string;
};

export function EndpointDoc({ endpoint }: { endpoint: Endpoint }): React.JSX.Element {
  return (
    <article className="border-b border-bg-elevated pb-10 last:border-b-0">
      <header className="mb-3 flex flex-wrap items-baseline gap-3">
        <span className="rounded bg-bg-elevated px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-text-primary">
          {endpoint.method}
        </span>
        <code className="font-mono text-sm text-text-primary">{endpoint.path}</code>
      </header>
      <p className="mb-2 font-sans text-base font-semibold text-text-primary">
        {endpoint.summary}
      </p>
      <p className="mb-4 font-serif text-sm text-text-muted">{endpoint.description}</p>

      {endpoint.params && endpoint.params.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-text-subtle">
            Query parameters
          </h4>
          <ul className="space-y-2 font-mono text-[12px]">
            {endpoint.params.map((p) => (
              <li key={p.name} className="flex flex-wrap gap-x-3">
                <span className="text-text-primary">
                  {p.name}
                  {p.required && <span className="text-status-blocked">*</span>}
                </span>
                <span className="text-text-subtle">{p.type}</span>
                <span className="basis-full font-serif text-[13px] text-text-muted md:basis-auto md:flex-1">
                  {p.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <h4 className="font-mono text-[11px] uppercase tracking-widest text-text-subtle">
            Example
          </h4>
          <CopyButton text={endpoint.exampleCurl} label="Copy curl" />
        </div>
        <pre className="overflow-x-auto rounded bg-bg-panel px-4 py-3 font-mono text-[12px] text-text-primary">
          <code>{endpoint.exampleCurl}</code>
        </pre>
      </div>

      <div>
        <h4 className="mb-1 font-mono text-[11px] uppercase tracking-widest text-text-subtle">
          Response
        </h4>
        <pre className="overflow-x-auto rounded bg-bg-panel px-4 py-3 font-mono text-[11px] leading-5 text-text-primary">
          <code>{endpoint.exampleResponse}</code>
        </pre>
      </div>
    </article>
  );
}
