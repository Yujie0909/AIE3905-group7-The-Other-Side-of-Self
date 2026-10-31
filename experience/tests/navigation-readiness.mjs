import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.STATIC_BASE_URL||'http://localhost:5220';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const mode of ['native','fallback','reduced']){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:mode==='reduced'?'reduce':'no-preference'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(mode=>{window.__decodes=0;const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){window.__decodes++;return decode.call(this)};if(mode==='fallback')Object.defineProperty(document,'startViewTransition',{value:undefined,configurable:true})},mode);
  let release,started=false;const hold=new Promise(r=>release=r);
  await p.route('**/assets/page02-*.webp',async route=>{started=true;await hold;await route.continue()});
  await p.goto(base);await p.locator('.page01-stage[data-background-ready=true]').waitFor();
  const start=p.getByRole('button',{name:'开始体验',exact:true});await start.click();
  await p.getByRole('status').filter({hasText:'正在准备下一页'}).waitFor();assert.ok(started);assert.equal(await p.locator('.static-page-02').count(),0,'No new content over an unavailable background');
  assert.equal(await p.locator('.page01-environment').evaluate(e=>getComputedStyle(e).visibility),'visible');
  // Ignore a rapid extra click rather than stacking another transition.
  await start.dispatchEvent('click');release();
  await p.locator('.static-page-02[data-background-ready=true]').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.equal(await p.locator('.scene-outgoing').count(),0);
  await p.waitForFunction(()=>performance.getEntriesByName('scene:ready:3:true').length>0);
  // Repeated visits use the retained, decoded resource, not decode() again.
  const count=await p.evaluate(()=>window.__decodes);
  for(const [name,selector] of [['01 开始','.page01-stage'],['02 想象','.static-page-02'],['01 开始','.page01-stage'],['02 想象','.static-page-02']]){
   await p.getByRole('button',{name,exact:true}).click();await p.locator(selector+'[data-background-ready=true]').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();
  }
  assert.equal(await p.evaluate(()=>window.__decodes),count,'Cached navigation must not repeat image decode');assert.equal(await p.locator('canvas').count(),0);assert.deepEqual(errors,[]);console.log('PASS atomic slow-loading navigation, rapid clicks, decoded cache reuse and cleanup:',mode);await context.close();
 }
 // Failed downloads leave the usable page intact and the existing Retry works.
 {
  const p=await browser.newPage({reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));let fail=true;
  await p.route('**/assets/page02-*.webp',route=>fail?route.abort('failed'):route.continue());await p.goto(base);await p.locator('.page01-stage[data-background-ready=true]').waitFor();await p.getByRole('button',{name:'开始体验',exact:true}).click();await p.getByRole('button',{name:'重试',exact:true}).waitFor();assert.equal(await p.locator('.static-page-02').count(),0);fail=false;await p.getByRole('button',{name:'重试',exact:true}).click();await p.locator('.static-page-02[data-background-ready=true]').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.deepEqual(errors,[]);console.log('PASS failed download preserves current page and retry recovers');await p.close();
 }
}finally{await browser.close()}
