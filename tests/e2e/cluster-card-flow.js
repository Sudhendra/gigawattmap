// Local production build at :3000. Same-coordinate fixtures prove there is no zoom-click ladder.
async (page) => {
  await page.goto('about:blank');
  await page.unrouteAll({behavior: 'wait'});
  const records = Array.from({length: 125}, (_, i) => ({type: 'Feature', geometry: {type: 'Point', coordinates: [-95, 38]}, properties: {
    id: `cluster-test-${i}`, name: `Test facility ${i}`, operator: i === 124 ? 'Equinix' : 'Unknown', operator_id: i === 124 ? 'equinix' : null,
    tenant: '', country: 'US', region: 'Kansas', tier: 'colo', status: null, est_mw_mid: null, sources: ['test'],
  }}));
  await page.route('http://localhost:3000/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/v1/updates/map') await route.fulfill({json: {schema_version: 1, channel: 'map', updated_at: new Date().toISOString(), records, changes: null}});
    else {const response = await route.fetch({url: 'https://gigawattmap.com' + path, timeout: 20000}); await route.fulfill({response});}
  });
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('http://localhost:3000/');
  await page.getByRole('status').filter({hasText: '125 facilities'}).waitFor();
  await page.waitForTimeout(3000);
  const canvas = page.locator('.maplibregl-canvas');
  await page.evaluate(() => {window.__clusterCanvas = document.querySelector('.maplibregl-canvas'); window.__clusterDocument = true;});
  const requests = [];
  const listener = request => {if (request.isNavigationRequest() || new URL(request.url()).searchParams.has('_rsc')) requests.push(request.url());};
  page.on('request', listener);
  try {
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Missing map canvas');
    await canvas.click({position: {x: bounds.width / 2, y: bounds.height / 2}});
    const dialog = page.getByRole('dialog', {name: '125 facilities in this cluster'});
    await dialog.waitFor();
    await dialog.getByRole('button', {name: 'Show next 50 facilities'}).click();
    if (await dialog.locator('li').count() !== 100) throw new Error('Pagination failed');
    await page.setViewportSize({width: 390, height: 844});
    await dialog.getByRole('textbox', {name: 'Search this cluster'}).fill('cluster-test-124');
    if (await dialog.locator('li').count() !== 1) throw new Error('Search missed a later cluster member');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile overflow');
    await page.screenshot({path: 'output/playwright/cluster-picker-mobile.png'});
    await dialog.locator('li button').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/?dc=cluster-test-124');
    await page.getByRole('region', {name: 'Test facility 124', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Back to results', exact: true}).click();
    await page.waitForURL('http://localhost:3000/');
    if (requests.length) throw new Error('Cluster/card interactions navigated: ' + requests.join(', '));
    if (!await page.evaluate(() => window.__clusterDocument && window.__clusterCanvas === document.querySelector('.maplibregl-canvas'))) throw new Error('Map was replaced');
  } finally {page.off('request', listener);}
}
