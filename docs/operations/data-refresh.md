# Live data refreshes

The existing Python pipeline runs on GitHub Actions; Cloudflare R2 stores the output and the existing Worker serves it. Pages only needs a redeploy when frontend code changes. Data refreshes do not rebuild Pages.

## Schedules and commands

- News: daily at 10:17 UTC, `.github/workflows/refresh-news.yml`. Run locally from `data-pipeline`: `PYTHONPATH=. uv run python -m opendc.refresh news`.
- Map: Mondays at 08:43 UTC, `.github/workflows/refresh-map.yml`. Run locally: `PYTHONPATH=. uv run python -m opendc.map_refresh`.
- Both workflows support **Run workflow** in GitHub Actions. They require `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` repository secrets, scoped to the existing `gigawattapp` bucket.
- Each run uses a clean output directory on the hosted runner, locked Python dependencies, a timeout, concurrency control, and relevant regression tests before fetching.

## Publication and recovery

Validated snapshots are uploaded to `v1/releases/{news|map}/{timestamp}-{hash}.json`, then copied as a complete object to `v1/live/{news|map}.json`. The live object is a single atomic snapshot, including its refresh timestamp and source metadata. A failure before that final write leaves the previous snapshot serving. Historical snapshots are retained; do not delete the last three releases.

The Worker serves `/api/v1/updates/news` and `/api/v1/updates/map` from its existing R2 binding with a five-minute cache lifetime and the existing rate limit. It does not hold an indefinite in-memory copy. Production clients use these endpoints; local development retains bundled seeds. No additional public environment variables are required.

Rollback: download a known-good archived JSON object, validate its channel and schema, and upload its exact bytes over the matching `v1/live/{channel}.json` key using the same content type and five-minute cache control. Never roll back one channel over the other. The Actions artifacts include the output and manifest with counts, sources, timestamps, and SHA-256 for investigation.

Map publication requires at least 4,000 facilities and at least 80% of the previous count. A legitimate large decline needs review; do not lower the guard simply to get a green run. Overpass failures retry with backoff. Check the Actions logs and retry manually after upstream recovery; use `OPENDC_OVERPASS_URL` to select a healthy mirror.

News currently has one automated publisher. If it fails, publication fails and the previous feed remains. Entries retain their actual publication date. A successful daily check does not guarantee a new relevant headline every day. RSS headlines are retained for 180 days; curated entries are preserved. RSS adds no inferred amounts, operator links, or map coordinates.

## Source permissions and limits

Converge Digest RSS: https://convergedigest.com/feed/
Terms reviewed October 24, 2026: https://convergedigest.com/terms-of-service/ permits attributed non-commercial excerpts. Only linked headlines, publisher name, and date are retained; no article body, image, or generated summary. Publisher-owned content is not relicensed CC BY and is not committed to Git. Robots rules are fetched and checked on every run. Revisit permission before monetizing. Other publishers require a separate permission review before enabling ingestion.

OSM remains ODbL with visible attribution. The map snapshot is an ODbL-derived point view, using the existing curated/OSM merge. It does not combine cable content or other restricted sources. Original geometries remain in the pipeline run artifacts. The renderer and search use the same snapshot; no new PMTiles are required for the point layer. Existing downloadable files and PMTiles retain their own April 2026 timestamps until their separate export jobs are refreshed.

Weekly OSM refreshes do not re-verify curated MW figures, project lifecycle claims, cloud regions, cables, power plants, or opposition records. Those are separate source lifecycles. Unknown status and capacity are displayed as unknown, not fabricated. Add monthly refresh jobs for secondary layers only when their renderers and publication contracts are ready.

## Monitoring

Enable GitHub Actions failure notifications for the maintainer. Inspect the last successful run weekly. GitHub cron is best-effort, can be delayed, and public-repository scheduled workflows can be disabled after 60 days without repository activity; re-enable them in Actions if disabled. See https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule . The news UI marks refreshes older than 48 hours and the map marks refreshes older than 14 days. These labels are a user-visible warning, not an independent uptime monitor.

Do not claim the automation is operational until secrets exist, both workflows have completed manually, the Worker and Pages code are deployed, and the public endpoints show the new snapshots.
