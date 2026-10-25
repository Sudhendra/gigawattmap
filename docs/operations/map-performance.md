# Map performance verification

Measured October 25, 2026 against the production build on an Apple M4 Pro with Chromium's native Metal renderer.

## Changes

Facilities now use MapLibre's native clustered GeoJSON source. Clicking clusters expands them; individual facilities retain cards and shareable URLs. Company highlighting preserves other facilities as dimmed context. Cluster labels count all facilities, as explained in the market panel.

The secondary deck.gl renderer, cloud/opposition/cable datasets, detail cards and search index load on demand. Optional data is validated with a timeout and retry feedback. Cable geometry is cached between animation frames. Reduced-motion preferences disable cable animation and nonessential facility fly-to transitions.

## Results and limits

- Next initial JavaScript: 137 KB, previously 210 KB.
- Entire default map session JavaScript: approximately 426 KB gzip, including route prefetches. This **does not meet the 350 KB budget**. The installed MapLibre chunk (270,537 bytes), React chunk (54,275) and Next runtime chunk (45,521) alone total 370,333 bytes. Deferring MapLibre does not remove it from this total.
- Cold-cache FCP with gzip delivery, 1.6 Mbps download, 750 Kbps upload, 150 ms latency and 4× CPU slowdown: 916, 968 and 984 ms; median **968 ms**. This measures first content, not map-ready time, on a local compressed server with public API proxying; it is not a production field percentile.
- Synthetic 10,000-facility clustered pan at zoom 4.2 and 1440×900: **60.19 animation frames/second**, average 16.67 ms, p95 16.7 ms. This is a requestAnimationFrame responsiveness proxy during simulated dragging, not a GPU frame-presentation trace or a guarantee for mobile devices.

The performance task remains unfinished because total JavaScript exceeds budget. A MapLibre 6 upgrade was inspected but not adopted: its published main and worker modules gzip to about 292 KB and 147 KB respectively, so a version bump alone is not evidence of a smaller complete payload. A future renderer/framework decision needs a measured prototype and preserved map behavior.

## Reproduce

Build with `NEXT_PUBLIC_API_BASE= pnpm --filter @gigawattmap/web build`.
Serve `apps/web/out` on port 3000 for interaction/pan checks. For the compressed load check, run `python3 tests/e2e/serve-compressed.py` (port 3002).

Using the Playwright CLI skill's persistent Chromium session:

```sh
playwright-cli -s=gigawatt run-code --filename tests/e2e/map-pan-benchmark.js
playwright-cli -s=gigawatt eval 'window.__gigawattPanBenchmark'
playwright-cli -s=gigawatt run-code --filename tests/e2e/map-cold-load.js
playwright-cli -s=gigawatt eval 'window.__gigawattColdLoad'
```

The fixtures intercept local requests only; synthetic facilities are never published. Cold-load checks clear cache each run and restore network/CPU settings in a finally block. Sum gzip sizes of all JavaScript resource entries after the default map finishes loading, including dynamic chunks; Next's first-load figure alone is insufficient.
