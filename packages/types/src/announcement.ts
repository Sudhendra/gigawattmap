/** Editorial bucket for the announcements feed. */
export type AnnouncementCategory =
  | 'lease'
  | 'ppa'
  | 'capex'
  | 'opening'
  | 'opposition'
  | 'permit'
  | 'm_and_a'
  | 'other';

/**
 * A dated, material AI-infrastructure announcement. Sourced from
 * DCD, Data Center Frontier, SEC 8-Ks, and operator press releases.
 *
 * Either `operator_id` or `datacenter_id` should be set so the feed
 * can pin to the right pin on the map.
 */
export type Announcement = {
  /** Stable slug-style id, e.g. "2026-04-meta-richland". */
  id: string;
  /** ISO 8601 date (YYYY-MM-DD). */
  date: string;
  title: string;
  operator_id: string | null;
  datacenter_id: string | null;
  /** Deal size in USD; null when not disclosed. */
  amount_usd: number | null;
  category: AnnouncementCategory;
  source_url: string;
};
