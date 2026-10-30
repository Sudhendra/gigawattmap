import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('public About contact details', () => {
  it('links to the owner-approved email and project repository', () => {
    const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    for (const name of ['hello', 'support', 'sudhendra']) {
      expect(page).toContain(`mailto:${name}@gigawattmap.com`);
    }
    expect(page).toContain('https://github.com/Sudhendra/gigawattmap');
    expect(page).not.toContain('sudhendrakambhamettu@gmail.com');
    expect(page).not.toContain('github.com/gigawattmap/gigawattmap');
  });
});
