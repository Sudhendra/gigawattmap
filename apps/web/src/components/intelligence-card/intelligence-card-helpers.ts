import type { Announcement } from '@gigawattmap/types';
import { tickerForOperator as resolveTicker } from '@/lib/ticker-map';

/**
 * Pick the most relevant announcements for a given campus, joined by
 * either `datacenter_id` (direct hit) or `operator_id` (parent-operator
 * context). Newest first, deduplicated, capped at `limit`.
 *
 * Returning a ranked, bounded list keeps the intelligence card scannable
 * and avoids redoing this filter inside React. Both ids may be null —
 * when both are null we return an empty list rather than the full feed.
 */
export function selectAnnouncementsForCampus(
  announcements: readonly Announcement[],
  datacenterId: string | null | undefined,
  operatorId: string | null | undefined,
  limit: number,
): Announcement[] {
  if (!datacenterId && !operatorId) return [];
  const seen = new Set<string>();
  const matches: Announcement[] = [];
  for (const a of announcements) {
    if (seen.has(a.id)) continue;
    const dcHit = datacenterId != null && a.datacenter_id === datacenterId;
    const opHit = operatorId != null && a.operator_id === operatorId;
    if (dcHit || opHit) {
      seen.add(a.id);
      matches.push(a);
    }
  }
  // Sort newest first by ISO date string (lexicographic == chronological for ISO).
  matches.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return matches.slice(0, limit);
}

/**
 * Re-export the ticker resolver from the same module so the intelligence
 * card has a single helpers entry point. The actual mapping lives with
 * the ticker editorial map (`ticker-map.ts`) so there is one source of
 * truth for operator ↔ ticker linkage.
 */
export const tickerForOperator = resolveTicker;
