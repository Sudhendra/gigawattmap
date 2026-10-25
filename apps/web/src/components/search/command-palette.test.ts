import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('lets Radix connect the search dialog to its accessible title', () => {
  const source = readFileSync(join(__dirname, 'command-palette.tsx'), 'utf8');
  expect(source).not.toMatch(/(?:id|aria-labelledby)=["']cmdk-title["']/);
  expect(source).toContain('<Dialog.Title');
});
