// Run against the deployed production build before/after changes.
async (page) => {
  await page.goto('about:blank');
  await page.unrouteAll({behavior: 'wait'});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('https://gigawattmap.com/?operator=equinix');
  await page.getByRole('button', {name: 'EQIX — Equinix: Show linked facilities', exact: true}).waitFor();
  await page.waitForFunction(() => !!document.querySelector('.maplibregl-canvas'));
  await page.evaluate(() => { window.__selectionDocument = {}; window.__selectionCanvas = document.querySelector('.maplibregl-canvas'); });
  const requests = [];
  const record = request => {
    if (request.isNavigationRequest() || new URL(request.url()).searchParams.has('_rsc')) requests.push(request.url());
  };
  page.on('request', record);
  try {
    await page.getByRole('button', {name: 'EQIX — Equinix: Show linked facilities', exact: true}).click();
    await page.waitForURL('https://gigawattmap.com/');
    await page.waitForTimeout(1000);
    if (requests.length) throw new Error('Selection navigated/refetched the route: ' + requests.join(', '));
    if (!await page.evaluate(() => !!window.__selectionDocument && window.__selectionCanvas === document.querySelector('.maplibregl-canvas'))) throw new Error('Selection replaced the document or map');
  } finally { page.off('request', record); }
}
