import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AppHeader is mounted globally in app/layout.tsx and must NOT be re-rendered
 * inside individual page modules. A second render produces a duplicate sticky
 * header bar (regression observed on /about, /data, /data/api).
 *
 * We assert against the page source file (not the rendered DOM) because the
 * apps/web vitest config does not load a JSX runtime — see AGENTS.md.
 */
describe('AppHeader is rendered once', () => {
  const repoRoot = join(__dirname, '..', '..', '..');

  const pages = [
    'src/app/about/page.tsx',
    'src/app/data/page.tsx',
    'src/app/data/api/page.tsx',
  ];

  it.each(pages)('%s does not import AppHeader', (relPath) => {
    const source = readFileSync(join(repoRoot, relPath), 'utf8');
    expect(source).not.toMatch(/from ['"]@\/components\/app-header['"]/);
  });

  it.each(pages)('%s does not render <AppHeader', (relPath) => {
    const source = readFileSync(join(repoRoot, relPath), 'utf8');
    expect(source).not.toMatch(/<AppHeader\b/);
  });

  it('layout.tsx is the sole AppHeader render site', () => {
    const layoutSource = readFileSync(join(repoRoot, 'src/app/layout.tsx'), 'utf8');
    expect(layoutSource).toMatch(/<AppHeader\b/);
  });
});
