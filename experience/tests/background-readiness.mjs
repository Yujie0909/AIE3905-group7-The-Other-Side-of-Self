import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const engine=process.env.BG_ENGINE||'chromium';
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
const dir=`artifacts/background-loading/readiness-${engine}`;await fs.mkdir(dir,{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}});let release,started;const gate=new Promise(r=>release=r),requested=new Promise(r=>started=r);
 await p.route('**/assets/page03-artwork-*',async route=>{started();await gate;await route.continue()});
 await p.goto(process.env.PROBE_URL||'http://localhost:5184');await p.waitForFunction(()=>document.querySelector('main')?.dataset.backgroundReady==='true');
 await p.getByRole('button',{name:'开始体验',exact:true}).click();await p.waitForFunction(()=>document.querySelector('main')?.dataset.backgroundReady==='true');
 await p.locator('textarea').fill('我希望有自由时间，在安静的空间阅读。');await p.getByRole('button',{name:'构建我的世界',exact:true}).click();await requested;
 const pending=await p.evaluate(()=>({ready:document.querySelector('main').dataset.backgroundReady,fallback:!!document.querySelector('.background-fallback'),fallbackComplete:document.querySelector('.background-fallback-image')?.complete,plateVisibility:getComputedStyle(document.querySelector('main>.static-environment')).visibility,artVisibility:getComputedStyle(document.querySelector('main>.static-artwork')).visibility}));
 assert.equal(pending.ready,'false');assert.equal(pending.fallback,true);assert.equal(pending.fallbackComplete,true);assert.equal(pending.plateVisibility,'hidden');assert.equal(pending.artVisibility,'hidden');await p.screenshot({path:dir+'/waiting-full-previous-scene.png'});
 release();await p.waitForFunction(()=>document.querySelector('main')?.dataset.backgroundReady==='true');assert.equal(await p.locator('.background-fallback').count(),0);await p.screenshot({path:dir+'/ready-full-new-scene.png'});
 // Resize from a mobile plate to a still-uncached desktop artwork; presentation must gate again.
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'继续探索',exact:true}).click();await p.waitForFunction(()=>document.querySelector('main')?.dataset.backgroundReady==='true');assert.equal(await p.locator('main>.static-artwork').count(),0);
 await p.setViewportSize({width:1440,height:900});await p.waitForFunction(()=>!!document.querySelector('main>.static-artwork')&&document.querySelector('main')?.dataset.backgroundReady==='true');assert.equal(await p.locator('main>.static-artwork').count(),1);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await fs.writeFile(dir+'/results.json',JSON.stringify({engine,pending,resizePassed:true},null,2));console.log('PASS',engine,'delayed artwork stays hidden; complete previous scene remains; resize rechecks decode');
}finally{await browser.close()}
