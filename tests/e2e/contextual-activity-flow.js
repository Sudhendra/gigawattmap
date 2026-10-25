// Local production build. Explicit links prove geography and company scope semantics.
async (page) => {
  await page.goto('about:blank');
  await page.unrouteAll({behavior:'wait'});
  const stamp = '2026-10-25T10:00:00Z';
  const records = [
    {id:'osm-node-123',name:'Evidence campus',operator:'Equinix',operator_id:'equinix',coordinates:[-95,38]},
    {id:'remote',name:'Remote campus',operator:'Amazon',operator_id:'amazon',coordinates:[120,-30]},
  ].map(({coordinates,...properties})=>({type:'Feature',geometry:{type:'Point',coordinates},properties:{...properties,tenant:'',country:'US',tier:'colo',status:null,est_mw_mid:null,sources:['osm']}}));
  const news = [
    {id:'direct',title:'Local facility announcement',datacenter_id:'osm-node-123'},
    {id:'operator',title:'Equinix company announcement',operator_id:'equinix'},
    {id:'remote',title:'Remote facility announcement',datacenter_id:'remote'},
    {id:'unlinked',title:'Unlinked Equinix NVIDIA headline'},
  ].map(item=>({...item,date:'2026-10-25',category:'news',source_url:'https://example.com/'+item.id}));
  await page.route('http://localhost:3000/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/v1/updates/map') await route.fulfill({json:{schema_version:1,channel:'map',updated_at:stamp,records,changes:{baseline_at:'2026-10-01T00:00:00Z',compared_at:stamp,events:records.map(f=>({id:f.properties.id,facility_id:f.properties.id,facility_name:f.properties.name,kind:'added',detected_at:stamp,fields:[],sources:['osm']}))}}});
    else if(path==='/api/v1/updates/news') await route.fulfill({json:{schema_version:1,channel:'news',updated_at:stamp,records:news}});
    else await route.fulfill({json:[]});
  });
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://localhost:3000/');
  await page.getByRole('status').filter({hasText:'2 facilities'}).waitFor();
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{window.__activityCanvas=document.querySelector('.maplibregl-canvas');window.__activityDocument=true;});
  const navigation=[];
  const listener=req=>{if(req.isNavigationRequest()||new URL(req.url()).searchParams.has('_rsc'))navigation.push(req.url());};
  page.on('request',listener);
  try {
    await page.getByRole('tab',{name:'Activity',exact:true}).click();
    const feed=page.getByRole('region',{name:'Announcements feed'});
    await feed.getByRole('button',{name:'Unlinked Equinix NVIDIA headline',exact:true}).waitFor();
    await page.getByRole('button',{name:'Selected company',exact:true}).click();
    await page.getByText('Select a company in Companies, or use operator search.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'This map area',exact:true}).click();
    await feed.getByRole('button',{name:'Local facility announcement',exact:true}).waitFor();
    if(await feed.getByRole('button',{name:'Equinix company announcement',exact:true}).count()) throw new Error('Company-wide news leaked into map area');
    if(await feed.getByRole('button',{name:'Remote facility announcement',exact:true}).count()) throw new Error('Remote news leaked into map area');
    await page.getByText('Recent dataset changes · 1',{exact:true}).click();
    await page.getByRole('region',{name:'Recent dataset changes',exact:true}).getByRole('button',{name:'Evidence campus',exact:true}).waitFor();
    await page.getByRole('tab',{name:'Companies',exact:true}).click();
    await page.getByRole('button',{name:'EQIX — Equinix: Show linked facilities',exact:true}).click();
    await page.getByRole('tab',{name:'Activity',exact:true}).click();
    await page.getByRole('button',{name:'Selected company',exact:true}).click();
    await feed.getByRole('button',{name:'Equinix company announcement',exact:true}).waitFor();
    if(await feed.getByRole('button',{name:'Unlinked Equinix NVIDIA headline',exact:true}).count())throw new Error('Headline guessed as company link');
    await page.screenshot({path:'output/playwright/activity-scopes-desktop.png'});
    await page.getByRole('button',{name:'Clear company selection',exact:true}).click();
    await page.getByRole('button',{name:'This map area',exact:true}).click();
    await feed.getByRole('button',{name:'Local facility announcement',exact:true}).click();
    await feed.getByRole('button',{name:'Open facility',exact:true}).click();
    const evidence=page.getByRole('region',{name:'Data and evidence',exact:true});
    await evidence.getByText('Not recorded',{exact:true}).waitFor();
    if(!(await evidence.innerText()).includes('10:00')) throw new Error('Dataset timestamp missing');
    const source=evidence.getByRole('link');
    if(await source.getAttribute('href')!=='https://www.openstreetmap.org/node/123')throw new Error('Wrong OSM evidence link');
    await page.getByText('Operator context · not specific to this facility',{exact:true}).waitFor();
    await page.setViewportSize({width:390,height:844});
    if(await page.getByRole('button',{name:'Expand research panel',exact:true}).count())await page.getByRole('button',{name:'Expand research panel',exact:true}).click();
    await evidence.scrollIntoViewIfNeeded();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile overflow');
    await page.screenshot({path:'output/playwright/facility-evidence-mobile.png'});
    await page.getByRole('button',{name:'Back to results',exact:true}).click();
    await page.getByRole('tab',{name:'Activity',exact:true}).click();
    await page.getByRole('button',{name:'This map area',exact:true}).click();
    await page.screenshot({path:'output/playwright/activity-scopes-mobile.png'});
    if(navigation.length||!await page.evaluate(()=>window.__activityDocument&&window.__activityCanvas===document.querySelector('.maplibregl-canvas')))throw new Error('Interaction replaced document or map');
  }finally{page.off('request',listener);}
}
