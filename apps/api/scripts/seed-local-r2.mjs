#!/usr/bin/env node
/**
 * Seed the local Miniflare R2 bucket with the latest pipeline output so
 * `wrangler dev` can serve `/api/v1/datacenters`, `/powerplants`,
 * `/announcements`, `/og`, etc. without hitting real Cloudflare R2.
 *
 * Why a script instead of a runtime fs-fallback: workerd sandboxes the
 * filesystem (a probe showed `fs.readdir('/')` returns only
 * `['bundle','tmp','dev']`), so reads of host paths fail with ENOENT
 * regardless of `nodejs_compat`. The only way to populate the dev
 * binding is via the wrangler CLI's R2 commands targeted at `--local`.
 *
 * Usage:
 *   1. Start the dev server in one terminal: `pnpm --filter api dev`
 *      (this creates the local Miniflare bucket on first request).
 *   2. In another terminal: `pnpm --filter api dev:seed-r2`.
 *   3. Restart the dev server so the in-isolate parsed-artifact cache
 *      is dropped, OR just hit endpoints that haven't been cached.
 *
 * The (R2 key → on-disk path) mapping mirrors
 * `data-pipeline/opendc/publish.py::PUBLICATION_CATALOG`. Whenever a row
 * is added there, add a row here. The contract is intentionally not
 * generated — `publish.py` is Python, this is Node, and a one-line
 * manual sync is cheaper than a code-gen pipeline.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Bucket name must match `[[r2_buckets]] bucket_name` in wrangler.toml.
const BUCKET = 'gigawattapp';

// Resolve the data-pipeline output directory relative to this script
// (apps/api/scripts/seed-local-r2.mjs → ../../../data-pipeline/out).
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', '..', '..', 'data-pipeline', 'out');

// (R2 key → relative path under data-pipeline/out/). Mirrors publish.py.
// Manifest sits at v1/, downloads at v1/downloads/.
const ARTIFACTS = [
  { key: 'v1/manifest.json', src: 'manifest.json' },
  { key: 'v1/downloads/datacenters.geojson', src: 'datacenters.geojson' },
  { key: 'v1/downloads/datacenters.csv', src: 'datacenters.csv' },
  { key: 'v1/downloads/powerplants.geojson', src: 'interim/powerplants.geojson' },
  { key: 'v1/downloads/cables.geojson', src: 'interim/cables.geojson' },
  { key: 'v1/downloads/landing-points.geojson', src: 'interim/landing-points.geojson' },
  { key: 'v1/downloads/cloud-regions.geojson', src: 'interim/cloud-regions.geojson' },
  { key: 'v1/downloads/opposition.geojson', src: 'interim/opposition.geojson' },
  { key: 'v1/downloads/announcements.json', src: 'interim/announcements.json' },
];

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function putOne(key, src) {
  const fullPath = resolve(OUT_DIR, src);
  if (!existsSync(fullPath)) {
    return { key, status: 'skipped', reason: `missing on disk: ${src}` };
  }
  const size = statSync(fullPath).size;
  // `wrangler r2 object put <bucket>/<key> --file <path> --local`. The
  // command is run via `pnpm exec wrangler` from apps/api so the
  // wrangler.toml in the same dir is picked up automatically.
  const apiDir = resolve(__dirname, '..');
  const args = [
    'exec',
    'wrangler',
    'r2',
    'object',
    'put',
    `${BUCKET}/${key}`,
    '--file',
    fullPath,
    '--local',
  ];
  const result = spawnSync('pnpm', args, {
    cwd: apiDir,
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    return {
      key,
      status: 'error',
      reason: (result.stderr || result.stdout || '').trim().split('\n').slice(-3).join(' | '),
    };
  }
  return { key, status: 'ok', size };
}

function main() {
  if (!existsSync(OUT_DIR)) {
    console.error(`[seed-local-r2] data-pipeline/out not found at ${OUT_DIR}`);
    console.error(`[seed-local-r2] Run \`uv run opendc all --sample\` first.`);
    process.exit(1);
  }
  console.log(`[seed-local-r2] bucket: ${BUCKET}  source: ${OUT_DIR}`);
  console.log(`[seed-local-r2] uploading ${ARTIFACTS.length} artifacts...\n`);

  const results = ARTIFACTS.map(({ key, src }) => putOne(key, src));

  let okCount = 0;
  let skipCount = 0;
  let errCount = 0;
  for (const r of results) {
    if (r.status === 'ok') {
      okCount += 1;
      console.log(`  ok      ${r.key}  (${fmtBytes(r.size)})`);
    } else if (r.status === 'skipped') {
      skipCount += 1;
      console.log(`  skip    ${r.key}  — ${r.reason}`);
    } else {
      errCount += 1;
      console.log(`  ERROR   ${r.key}  — ${r.reason}`);
    }
  }

  console.log(`\n[seed-local-r2] done: ${okCount} ok, ${skipCount} skipped, ${errCount} errors`);
  if (errCount > 0) process.exit(1);
}

main();
