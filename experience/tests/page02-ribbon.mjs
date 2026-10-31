import {chromium,webkit} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const engine=process.env.ENGINE||'chromium';
const width=Number(process.env.WIDTH||1440),height=width===1920?1080:width===390?844:900;
const dir=`artifacts/page02-ribbon/${engine}-${width}`;
await fs.mkdir(dir,{recursive:true});
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
const report={engine,width,height,frames:[],errors:[],requests:[],checks:{}};
try{
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('request',request=>{if(/\.(webp|jpg)(\?|$)/.test(request.url()))report.requests.push(request.url())});
 await page.goto(process.env.STATIC_BASE_URL||'http://localhost:5200');
 const idle=async n=>{await page.locator(n===1?'.page01-stage':`.static-page-${String(n).padStart(2,'0')}`).waitFor();await page.locator('.scene-frame[data-navigation-state=idle]').waitFor();await page.locator('[data-motion-ready=true]').waitFor({state:'attached'})};
 await idle(1);await page.getByRole('button',{name:'开始体验',exact:true}).click();await idle(2);
 await page.locator('.static-page-02 [data-motion-state=running]').waitFor();
 await page.evaluate(()=>document.fonts.ready);await page.mouse.move(3,3);await page.evaluate(()=>document.activeElement?.blur());
 const sample=()=>page.evaluate(()=>{
  const host=document.querySelector('[data-scene-motion]'),image=document.querySelector('main > img'),r=image.getBoundingClientRect(),hr=host.getBoundingClientRect();
  const scale=Math.max(r.width/image.naturalWidth,r.height/image.naturalHeight),position=getComputedStyle(image).objectPosition.split(' ').map(parseFloat);
  const camera={x:r.x+(r.width-image.naturalWidth*scale)*position[0]/100,y:r.y+(r.height-image.naturalHeight*scale)*position[1]/100,scale};
  const ribbons=[...host.querySelectorAll('.dream-tile[data-dream-loop=ribbon]')].map(tile=>{
   const group=tile.querySelector('[data-ribbon-route]'),section=tile.querySelector('[data-ribbon-section="5"]'),path=tile.querySelector('[data-ribbon-guide]'),distance=getComputedStyle(section).offsetDistance,center=path.getPointAtLength(path.getTotalLength()*parseFloat(distance)/100),m=path.getScreenCTM()||{a:0,d:0,e:0,f:0},box=section.getBoundingClientRect();
   return {route:group.dataset.ribbonRoute,center:{x:center.x,y:center.y},matrix:{a:m.a,d:m.d,e:m.e,f:m.f},offsetDistance:distance,screenCenter:{x:box.x+box.width/2,y:box.y+box.height/2},sections:tile.querySelectorAll('[data-ribbon-section]').length};
  });
  return {now:performance.now(),camera,host:hr.toJSON(),ribbons,title:document.querySelector('h1').getBoundingClientRect().toJSON(),copy:document.querySelector('.static-copy').getBoundingClientRect().toJSON(),input:document.querySelector('textarea').getBoundingClientRect().toJSON(),stats:host.dataset.motionStats};
 });
 const began=Date.now();
 for(const seconds of [0,3,6]){
  await page.waitForTimeout(Math.max(0,began+seconds*1000-Date.now()));
  const frame=await sample();frame.targetSeconds=seconds;frame.elapsedMs=Date.now()-began;
  await page.screenshot({path:`${dir}/t${seconds}.png`,fullPage:true,caret:'hide'});report.frames.push(frame);
  await fs.writeFile(`${dir}/frames.json`,JSON.stringify(report.frames,null,2));
  assert.equal(frame.ribbons.length,3);
  for(const ribbon of frame.ribbons){
   assert.ok(Math.abs(ribbon.matrix.a-frame.camera.scale)<.001);
   assert.ok(Math.abs(ribbon.matrix.d-frame.camera.scale)<.001);
   assert.ok(Math.abs(ribbon.matrix.e-frame.camera.x)<.1);
   assert.ok(Math.abs(ribbon.matrix.f-frame.camera.y)<.1);
   // WebKit's scaled CSS path and SVG getPointAtLength use slightly different
   // curve flattening. Measured displacement was ~0.25px at 1920, not drift.
   assert.ok(Math.abs(ribbon.screenCenter.x-(frame.camera.x+ribbon.center.x*frame.camera.scale))<1,JSON.stringify({camera:frame.camera,ribbon}));
   assert.ok(Math.abs(ribbon.screenCenter.y-(frame.camera.y+ribbon.center.y*frame.camera.scale))<1,JSON.stringify({camera:frame.camera,ribbon}));
   assert.equal(ribbon.sections,11);
  }
 }
 for(let i=1;i<report.frames.length;i++){
  assert.deepEqual(report.frames[0].title,report.frames[i].title);
  assert.deepEqual(report.frames[0].copy,report.frames[i].copy);
  assert.deepEqual(report.frames[0].input,report.frames[i].input);
  for(let k=0;k<3;k++){const a=report.frames[i-1].ribbons[k].center,b=report.frames[i].ribbons[k].center;assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>90,'Real gradient must travel along its path')}
 }
 // Freeze via the same lifecycle handler used by hidden tabs. Comparing a
 // visible/hidden ribbon isolates its paint from the independently moving lake.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
 await page.waitForTimeout(120);const paused=await sample();await page.waitForTimeout(250);assert.deepEqual((await sample()).ribbons,paused.ribbons);
 await page.screenshot({path:`${dir}/ribbon-on.png`,fullPage:true,caret:'hide'});
 const mask=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=innerWidth;c.height=document.documentElement.scrollHeight;const ctx=c.getContext('2d');
  ctx.strokeStyle='white';ctx.lineWidth=34;ctx.lineCap='round';
  for(const path of document.querySelectorAll('.dream-tile[data-dream-loop=ribbon] [data-ribbon-guide]')){const m=path.getScreenCTM();ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.stroke(new Path2D(path.getAttribute('d')))}
  document.querySelectorAll('.dream-tile[data-dream-loop=ribbon]').forEach(e=>e.style.visibility='hidden');
  return c.toDataURL('image/png').split(',')[1];
 });
 await fs.writeFile(`${dir}/ribbon-mask.png`,Buffer.from(mask,'base64'));
 await page.screenshot({path:`${dir}/ribbon-off.png`,fullPage:true,caret:'hide'});
 await page.evaluate(()=>{document.querySelectorAll('.dream-tile[data-dream-loop=ribbon]').forEach(e=>e.style.removeProperty('visibility'));delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
 await page.waitForTimeout(300);assert.notDeepEqual((await sample()).ribbons,paused.ribbons);
 report.checks.hiddenPauseAndResume=true;
 // Preserve existing business-driven transition: submit -> generation -> Page03.
 await page.evaluate(()=>window.__oldRibbon=document.querySelector('.dream-tile[data-dream-loop=ribbon]'));
 await page.locator('textarea').fill('我希望有自由时间，在安静的空间阅读和创作。');
 await page.getByRole('button',{name:'构建我的世界',exact:true}).click();await idle(3);
 assert.equal(await page.locator('.static-page-03').count(),1);
 assert.equal(await page.locator('.dream-tile[data-dream-loop=ribbon]').count(),0);
 assert.equal(await page.evaluate(()=>window.__oldRibbon.isConnected),false);
 assert.equal(await page.evaluate(()=>window.__oldRibbon.getAnimations({subtree:true}).length),0);
 report.checks.leaveDisposesAndBusinessGenerationWorks=true;
 await page.getByRole('button',{name:'02 想象',exact:true}).click();await idle(2);
 assert.equal(await page.locator('.dream-tile[data-dream-loop=ribbon]').count(),3);
 assert.ok((await page.locator('textarea').inputValue()).includes('自由时间'));
 report.checks.revisitNoDuplicateAndInputPreserved=true;
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-motion-state=reduced]').waitFor({state:'attached'});await page.waitForTimeout(120);
 const reduced=await sample();await page.waitForTimeout(250);assert.deepEqual((await sample()).ribbons,reduced.ribbons);
 assert.equal(await page.locator('[data-scene-motion]').isVisible(),false);report.checks.reducedMotion=true;
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-motion-state=running]').waitFor();await page.waitForTimeout(100);
 const restored=await page.locator('.dream-tile[data-dream-loop=ribbon]').first().locator('[data-ribbon-section]').evaluateAll(nodes=>nodes.map(e=>parseFloat(getComputedStyle(e).offsetDistance)));
 assert.ok(Math.max(...restored)-Math.min(...restored)>12,'Reduced-motion must preserve the relative phases of the continuous light band');
 report.checks.reducedMotionRestoreKeepsRibbonCoherent=true;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(report.errors,[]);
 await fs.writeFile(`${dir}/results.json`,JSON.stringify(report,null,2));
 console.log('PASS actual ribbon travel / photo alignment / lifecycle / generation / reduced-motion',engine,width);
}finally{await browser.close()}
