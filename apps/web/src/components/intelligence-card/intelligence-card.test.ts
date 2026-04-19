import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Radix's DialogTitle warning checks `document.getElementById(titleId)` against
 * its internally generated id. Wrapping Dialog.Title with `asChild` over an
 * <h2 id="intel-card-title"> overrides Radix's id, breaking the check and
 * triggering a false-positive console error. Letting Radix own the id (and
 * the corresponding aria-labelledby on Dialog.Content) silences the warning
 * and remains fully a11y-correct.
 */
describe('intelligence-card Dialog wiring', () => {
  const source = readFileSync(
    join(__dirname, 'intelligence-card.tsx'),
    'utf8',
  );

  it('does not hard-code id="intel-card-title"', () => {
    expect(source).not.toMatch(/id=["']intel-card-title["']/);
  });

  it('does not hard-code aria-labelledby="intel-card-title"', () => {
    expect(source).not.toMatch(/aria-labelledby=["']intel-card-title["']/);
  });

  it('still mounts a Dialog.Title', () => {
    expect(source).toMatch(/<Dialog\.Title\b/);
  });
});
