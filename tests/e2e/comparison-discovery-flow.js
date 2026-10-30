async (page) => {
  await page.goto('about:blank'); await page.unrouteAll({behavior:'wait'});
  const records=Array.from({length:4},(_,i)=>({type:'Feature',geometry:{type:'Point',coordinates:[-95,38]},properties:{id:'compare-'+i,name:'Comparison facility '+i,operator:'Equinix',operator_id:'equinix',tenant:'',country:'US',tier:'colo',status:null,est_mw_mid:i===0?0:null,sources:[]}}));
  await page.route('http://localhost:3000/api/v1/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    await route.fulfill({json:path.endsWith('/updates/map')?{schema_version:1,channel:'map',updated_at:'2026-10-30T00:00:00Z',records,changes:null}:path.endsWith('/updates/news')?{schema_version:1,channel:'news',updated_at:'2026-10-30T00:00:00Z',records:[]}:[]});
  });
  await page.setViewportSize({width:1440,height:900}); await page.goto('http://localhost:3000/');
  await page.getByRole('status').filter({hasText:'4 facilities'}).waitFor(); await page.waitForTimeout(1800);
  await page.evaluate(()=>{window.__compareCanvas=document.querySelector('.maplibregl-canvas');});
  await page.getByRole('button',{name:'Choose facilities',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Facility comparison',exact:true});
  const search=dialog.getByRole('textbox',{name:'Add a facility',exact:true});
  await search.fill('no such campus');
  await dialog.getByText('No unselected facilities match. Try another name or location.',{exact:true}).waitFor();
  for(let i=0;i<3;i++){
    await search.fill('Comparison facility '+i);
    const add=dialog.getByRole('button',{name:'Add Comparison facility '+i+' to comparison',exact:true});
    await add.focus(); await page.keyboard.press('Enter');
  }
  if(await search.count())throw new Error('Search should hide at capacity');
  await dialog.getByRole('cell',{name:'0 MW',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/comparison-discovery-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Page overflow');
  await page.screenshot({path:'output/playwright/comparison-discovery-mobile.png'});
  await dialog.getByRole('button',{name:'Remove Comparison facility 1 from comparison',exact:true}).click();
  await search.fill('Comparison facility 3');
  await dialog.getByRole('button',{name:'Add Comparison facility 3 to comparison',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'View comparison',exact:true}).waitFor();
  await page.getByRole('button',{name:'Remove Comparison facility 0 from tray',exact:true}).click();
  await page.getByRole('button',{name:'Clear comparison',exact:true}).click();
  await page.getByRole('button',{name:'Choose facilities',exact:true}).waitFor();
  if(!await page.evaluate(()=>window.__compareCanvas===document.querySelector('.maplibregl-canvas')))throw new Error('Map recreated');
}
