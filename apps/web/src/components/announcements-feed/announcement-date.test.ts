import { expect, it } from 'vitest';
import { formatAnnouncementDate } from './announcements-helpers';

it('keeps the publication calendar day for readers west of UTC', () => {
  const original = process.env.TZ;
  process.env.TZ = 'America/Chicago';
  try {
    expect(formatAnnouncementDate('2026-10-23', 'en-US')).toBe('Oct 23');
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
