// Cold-cache, 1.6 Mbps down / 750 Kbps up, 150 ms latency, 4x CPU slowdown.
// Start serve-compressed.py first; assets are gzip-compressed as on a CDN.
async (page) => {
  await page.goto('about:blank');
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('http://localhost:3002/api/v1/**', async route => {
    const response = await route.fetch({ url: 'https://gigawattmap.com' + new URL(route.request().url()).pathname, timeout: 20000 });
    await route.fulfill({ response });
  });
  const session = await page.context().newCDPSession(page);
  const results = [];
  await session.send('Network.enable');
  try {
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, connectionType: 'cellular4g' });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    for (let i = 0; i < 3; i++) {
      await session.send('Network.clearBrowserCache');
      await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0);
      results.push(await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0].startTime));
    }
  } finally {
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await session.send('Network.setCacheDisabled', { cacheDisabled: false });
    await session.detach();
  }
  await page.evaluate(values => { window.__gigawattColdLoad = { fcpMilliseconds: values, median: [...values].sort((a,b) => a-b)[1], network: '1.6 Mbps / 150ms', cpuSlowdown: 4, server: 'local gzip' }; }, results);
}
