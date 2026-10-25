import type { MapChanges, DatasetChange, DatasetFieldChange } from '@gigawattmap/types';
import { ReleaseError } from './live-release';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ReleaseError('Invalid change history');
  return value as Record<string, unknown>;
}
function date(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new ReleaseError('Invalid change timestamp');
  }
  return value;
}
function scalar(value: unknown): string | number | null {
  if (
    value === null ||
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value;
  throw new ReleaseError('Invalid changed value');
}
export function parseMapChanges(value: unknown, ids: ReadonlySet<string>): MapChanges | null {
  if (value === null || value === undefined) return null;
  const history = object(value);
  const baseline_at = date(history.baseline_at);
  const compared_at = history.compared_at === null ? null : date(history.compared_at);
  if (!Array.isArray(history.events) || history.events.length > 500)
    throw new ReleaseError('Invalid change events');
  const seen = new Set<string>();
  const events = history.events.map((value): DatasetChange => {
    const event = object(value);
    if (
      typeof event.id !== 'string' ||
      !event.id ||
      seen.has(event.id) ||
      typeof event.facility_id !== 'string' ||
      !ids.has(event.facility_id) ||
      typeof event.facility_name !== 'string' ||
      !['added', 'updated'].includes(String(event.kind)) ||
      !Array.isArray(event.sources) ||
      !event.sources.every((s: unknown) => typeof s === 'string') ||
      !Array.isArray(event.fields)
    )
      throw new ReleaseError('Invalid dataset change');
    seen.add(event.id);
    const fields = event.fields.map((value): DatasetFieldChange => {
      const field = object(value);
      if (!['operator', 'status', 'est_mw_mid'].includes(String(field.field)))
        throw new ReleaseError('Invalid changed field');
      const before = scalar(field.before),
        after = scalar(field.after);
      if (
        before === after ||
        (field.field === 'est_mw_mid'
          ? [before, after].some((v) => v !== null && (typeof v !== 'number' || v < 0))
          : [before, after].some((v) => v !== null && typeof v !== 'string'))
      )
        throw new ReleaseError('Invalid field values');
      return { field: field.field as DatasetFieldChange['field'], before, after };
    });
    if (
      (event.kind === 'added' && fields.length !== 0) ||
      (event.kind === 'updated' && fields.length === 0)
    ) {
      throw new ReleaseError('Invalid event fields');
    }
    return {
      id: event.id,
      facility_id: event.facility_id,
      facility_name: event.facility_name,
      kind: event.kind as DatasetChange['kind'],
      detected_at: date(event.detected_at),
      sources: event.sources as string[],
      fields,
    };
  });
  if (compared_at === null && events.length)
    throw new ReleaseError('Baseline cannot contain discoveries');
  return { baseline_at, compared_at, events };
}
