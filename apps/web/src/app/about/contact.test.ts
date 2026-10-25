import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public About contact details', () => {
  it('links to the owner-approved email and project repository', () => {
    const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    expect(page).toContain('mailto:sudhendrakambhamettu@gmail.com');
    expect(page).toContain('https://github.com/Sudhendra/gigawattmap');
    expect(page).not.toContain('hello@gigawattmap.com');
    expect(page).not.toContain('github.com/gigawattmap/gigawattmap');
  });
});
