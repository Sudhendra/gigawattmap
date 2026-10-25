// Local production build, real published data. No writes to production services.
async (page) => {
  await page.goto('about:blank');
  await page.unrouteAll({behavior: 'wait'});
  await page.route('http://localhost:3000/api/v1/**', async route => {
    const response = await route.fetch({url:'https://gigawattmap.com'+new URL(route.request().url()).pathname, timeout:20000});
    await route.fulfill({response});
  });
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://localhost:3000/');
  await page.getByRole('status').filter({hasText:'5,012 facilities'}).waitFor();
  await page.waitForFunction(()=>!!document.querySelector('.maplibregl-canvas'));
  await page.evaluate(()=>{window.__researchCanvas=document.querySelector('.maplibregl-canvas');window.__researchDocument=true;});
  const navigations=[];
  const record = request => {if(request.isNavigationRequest() || new URL(request.url()).searchParams.has('_rsc')) navigations.push(request.url());};
  page.on('request',record);
  try {
    await page.getByRole('textbox',{name:'Search companies'}).fill('Equinix');
    await page.getByRole('button',{name:'EQIX — Equinix: Show linked facilities',exact:true}).click();
    await page.getByRole('button',{name:'Only matches',exact:true}).click();
    await page.getByRole('button',{name:'Fit to facilities',exact:true}).click();
    await page.getByText('182 DCs',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Collapse research panel',exact:true}).click();
    await page.getByRole('button',{name:'Open research panel',exact:true}).click();
    await page.getByRole('tab',{name:'Layers',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('checkbox',{name:'Cloud regions',exact:true}).check();
    await page.getByRole('button',{name:'Light map',exact:true}).click();
    await page.waitForTimeout(2000);
    await page.getByText('182 DCs',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Dark map',exact:true}).click();
    await page.getByRole('checkbox',{name:'Cloud regions',exact:true}).uncheck();
    await page.getByRole('button',{name:'Clear company selection',exact:true}).click();
    await page.getByRole('tab',{name:'Companies',exact:true}).click();
    if(await page.getByRole('textbox',{name:'Search companies'}).inputValue()!=='Equinix') throw new Error('Tab lost company search');
    await page.getByRole('button',{name:/^Search/}).click();
    await page.getByRole('textbox',{name:'Search',exact:true}).fill('Equinix Ashburn DC18');
    await page.getByRole('option').filter({hasText:'Equinix Ashburn DC18'}).first().click();
    await page.getByRole('region',{name:'Equinix Ashburn DC18',exact:true}).waitFor();
    await page.getByRole('button',{name:'Share this campus',exact:true}).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Back to results',exact:true}).click();
    if(await page.getByRole('textbox',{name:'Search companies'}).inputValue()!=='Equinix') throw new Error('Back lost search context');
    await page.getByRole('tab',{name:'Activity',exact:true}).click();
    await page.getByRole('region',{name:'Announcements feed'}).waitFor();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Expand research panel',exact:true}).click();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Mobile overflow');
    await page.getByRole('button',{name:'Collapse research panel',exact:true}).click();
    await page.getByRole('button',{name:'Open research panel',exact:true}).click();
    if(!await page.evaluate(()=>window.__researchDocument&&window.__researchCanvas===document.querySelector('.maplibregl-canvas'))) throw new Error('Interaction replaced map/document');
    if(navigations.length) throw new Error('Unexpected navigation: '+navigations.join(', '));
    await page.screenshot({path:'output/playwright/research-workspace-mobile-verified.png'});
  } finally {page.off('request',record);}
}
