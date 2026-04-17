# Dev setup

Bare-minimum local environment for the Gigawatt Map repo. Everything else
lives in source — read it.

## Prereqs

- **Node 22.x + pnpm** — managed via Corepack (`corepack enable`).
- **Python 3.11+ + uv** — `curl -LsSf https://astral.sh/uv/install.sh | sh`.
- **Git, jq, curl** — every modern dev box has these.

## tippecanoe (PMTiles build)

The data pipeline shells out to `tippecanoe` to produce PMTiles archives.
It is a hard dependency of `opendc tiles build`.

**macOS:**

```sh
brew install tippecanoe
```

**Linux:**

```sh
git clone https://github.com/felt/tippecanoe.git /tmp/tippecanoe
cd /tmp/tippecanoe
make -j$(nproc)
sudo make install
```

Verify: `tippecanoe --version` should print `v2.x` or newer.

## Cloudflare R2 (PMTiles upload)

Provision a bucket named `gigawattmap`, then create an API token scoped to
`Object Read & Write` on that bucket.

CORS policy must allow the `Range` header — PMTiles fetches tiles via HTTP
range requests and silently fails without it. Sample policy:

```json
[
  {
    "AllowedOrigins": ["https://gigawattmap.com", "https://*.pages.dev", "http://localhost:3000"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": ["Content-Range", "Content-Length", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Copy `data-pipeline/.env.example` → `data-pipeline/.env.local` and fill in
the four values. Then:

```sh
cd data-pipeline
uv run python -m opendc.cli tiles build
uv run python -m opendc.cli tiles upload --dry-run   # safe preview
uv run python -m opendc.cli tiles upload             # for real
```

The web app reads `NEXT_PUBLIC_PMTILES_BASE` (set in `apps/web/.env.local`)
to decide whether to load PMTiles from R2 or fall back to bundled seed
GeoJSON.

## Common pipelines

```sh
# Ingest a small sample of every source.
cd data-pipeline
uv run python -m opendc.cli ingest all --sample

# Build & upload tiles.
uv run python -m opendc.cli tiles build
uv run python -m opendc.cli tiles upload

# Run the web app.
cd ../apps/web
pnpm dev
```
