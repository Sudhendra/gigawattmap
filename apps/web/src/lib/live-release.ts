import { API_BASE } from './env';

export class ReleaseError extends Error {}
export type LiveRelease = { updated_at: string; records: unknown[]; changes?: unknown };

export async function fetchLiveRelease(channel: 'news' | 'map'): Promise<LiveRelease> {
  const response = await fetch(`${API_BASE}/api/v1/updates/${channel}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new ReleaseError(`Could not load ${channel}: ${response.status}`);
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== 'object' ||
    !('schema_version' in data) ||
    data.schema_version !== 1 ||
    !('channel' in data) ||
    data.channel !== channel ||
    !('updated_at' in data) ||
    typeof data.updated_at !== 'string' ||
    !Number.isFinite(Date.parse(data.updated_at)) ||
    !('records' in data) ||
    !Array.isArray(data.records) ||
    data.records.length === 0
  ) {
    throw new ReleaseError('Invalid published dataset');
  }
  return {
    updated_at: data.updated_at,
    records: data.records,
    changes: 'changes' in data ? data.changes : undefined,
  };
}
