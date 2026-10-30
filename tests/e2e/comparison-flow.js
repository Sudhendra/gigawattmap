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
  for(let i=0;i<4;i++){
    await page.getByRole('button',{name:/^Search/}).click();
    await page.getByRole('textbox',{name:'Search',exact:true}).fill('Comparison facility '+i);
    await page.getByRole('option').filter({hasText:'Comparison facility '+i}).first().click();
    if(i<3)await page.getByRole('button',{name:'Add to comparison',exact:true}).click();
    else if(!await page.getByRole('button',{name:'Comparison full (3/3)',exact:true}).isDisabled())throw new Error('Limit missing');
    await page.getByRole('button',{name:'Back to results',exact:true}).click();
  }
  await page.getByRole('button',{name:'Compare facilities (3/3)',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Facility comparison',exact:true}); await dialog.waitFor();
  await dialog.getByRole('cell',{name:'0 MW',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/comparison-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Page overflow');
  await page.screenshot({path:'output/playwright/comparison-mobile.png'});
  await dialog.getByRole('button',{name:'Remove Comparison facility 1 from comparison',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Compare facilities (2/3)',exact:true}).waitFor();
  await page.getByRole('button',{name:'Clear comparison',exact:true}).click();
  if(await page.getByRole('region',{name:'Comparison tray'}).count())throw new Error('Clear failed');
  if(!await page.evaluate(()=>window.__compareCanvas===document.querySelector('.maplibregl-canvas')))throw new Error('Map recreated');
}
