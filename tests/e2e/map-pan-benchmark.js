// Run with playwright-cli -s=gigawatt run-code --filename tests/e2e/map-pan-benchmark.js
// Uses local production output at :3000. Synthetic records never reach production storage.
async (page) => {
  await page.goto('about:blank');
  await page.unrouteAll({ behavior: 'wait' });
  const records = Array.from({ length: 10000 }, (_, i) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [-125 + (i % 200) * 0.3, 25 + Math.floor(i / 200) * 0.5] },
    properties: { id: `benchmark-${i}`, name: `Benchmark facility ${i}`, operator: 'Unknown', operator_id: null,
      tenant: '', country: 'US', tier: 'colo', status: null, est_mw_mid: null, sources: ['benchmark'] },
  }));
  await page.route('http://localhost:3000/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/updates/map') {
      await route.fulfill({ json: { schema_version: 1, channel: 'map', updated_at: new Date().toISOString(), records, changes: null } });
    } else {
      const response = await route.fetch({ url: 'https://gigawattmap.com' + path, timeout: 20000 });
      await route.fulfill({ response });
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/');
  await page.getByRole('status').filter({ hasText: '10,000 facilities' }).waitFor();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  // Allow source clustering and the zoom transition to finish before timing pan input.
  await page.waitForTimeout(2000);
  const sample = page.evaluate(() => new Promise(resolve => {
    const frames = [];
    let previous = performance.now();
    const start = previous;
    function frame(now) {
      frames.push(now - previous);
      previous = now;
      if (now - start < 4000) requestAnimationFrame(frame);
      else {
        const sorted = frames.slice(1).sort((a, b) => a - b);
        const canvas = document.querySelector('canvas');
        const gl = canvas.getContext('webgl2');
        const extension = gl.getExtension('WEBGL_debug_renderer_info');
        const result = {
          features: 10000, zoom: 4.2, viewport: [innerWidth, innerHeight],
          averageFrameMs: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
          p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
          animationFramesPerSecond: frames.length * 1000 / (now - start),
          renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unknown',
        };
        window.__gigawattPanBenchmark = result;
        resolve(result);
      }
    }
    requestAnimationFrame(frame);
  }));
  await page.mouse.move(700, 350);
  await page.mouse.down();
  for (let i = 0; i < 120; i++) {
    await page.mouse.move(700 + Math.sin(i / 16) * 190, 350 + Math.sin(i / 12) * 60);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await sample;
  await page.screenshot({ path: 'output/playwright/10000-facilities-pan.png' });
}
