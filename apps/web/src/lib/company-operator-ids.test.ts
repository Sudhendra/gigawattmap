import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { COMPANY_OPERATOR_IDS } from './company-operator-ids';
it('keeps explicit news-company IDs aligned with the canonical operator registry', () => {
  const rows = readFileSync(
    resolve(import.meta.dirname, '../../../../data-pipeline/opendc/data/operators.csv'),
    'utf8',
  )
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .slice(1)
    .map((line) => line.split(','));
  const expected = Object.fromEntries(rows.filter((row) => row[3]).map((row) => [row[3], row[0]]));
  expect(COMPANY_OPERATOR_IDS).toEqual(expected);
});
