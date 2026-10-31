import {chromium,webkit} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const engine=process.env.ENGINE||'chromium',width=Number(process.env.WIDTH||1440),height=width===1920?1080:width===390?844:900;
const dir=`artifacts/page02-environment/${engine}-${width}`;await fs.mkdir(dir,{recursive:true});
const b=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']}));
try{
 const p=await b.newPage({viewport:{width,height}}),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url())});
 await p.goto(process.env.STATIC_BASE_URL||'http://localhost:5211');
 assert.equal(await p.locator('.page02-environment').count(),0);
 await p.getByRole('button',{name:'开始体验',exact:true}).click();await p.locator('.static-page-02').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();
 const host=p.locator('.page02-environment');await host.locator('canvas').waitFor();
 await p.waitForFunction(()=>Number(document.querySelector('.page02-environment')?.dataset.frames)>2);
 assert.equal(await host.getAttribute('data-material'),'webgl');
 const geometry=()=>p.locator('.static-title,.static-copy,.dream-capture,.static-progress').evaluateAll(es=>es.map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,color:getComputedStyle(e).color})));
 const initial=await geometry();await p.mouse.move(2,2);await p.evaluate(()=>document.activeElement?.blur());
 const start=Date.now(),samples=[];
 for(const second of [0,5,10]){
  const remaining=second*1000-(Date.now()-start);if(remaining>0)await p.waitForTimeout(remaining);
  samples.push(await host.evaluate(e=>({time:Number(e.dataset.time),frames:Number(e.dataset.frames),camera:JSON.parse(e.dataset.camera),material:e.dataset.material})));
  await p.screenshot({path:`${dir}/t-${second}.png`,fullPage:true,caret:'hide'});
 }
 assert.deepEqual(await geometry(),initial,'UI coordinates, font, and text remain stable');
 assert.ok(samples[2].frames>samples[0].frames+30);
 assert.equal(await host.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 // Reduced motion and background-tab lifecycle: no continuing render loop.
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);const stopped=await host.getAttribute('data-frames');await p.waitForTimeout(300);assert.equal(await host.getAttribute('data-frames'),stopped);assert.equal(await host.isVisible(),false);
 await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(200);assert.ok(Number(await host.getAttribute('data-frames'))>Number(stopped));
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(100);const hidden=await host.getAttribute('data-frames');await p.waitForTimeout(250);assert.equal(await host.getAttribute('data-frames'),hidden);
 await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
 // Real text input, clarification modal, original generation and navigation.
 await p.locator('textarea').fill('自由');await p.getByRole('button',{name:'构建我的世界',exact:true}).click();await p.locator('.static-clarification').waitFor();await p.getByRole('button',{name:'拥有更多自由时间',exact:true}).click();await p.getByRole('button',{name:'构建我的世界',exact:true}).click();await p.locator('.static-page-03').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.equal(await p.locator('.page02-environment').count(),0);assert.equal(await p.locator('canvas').count(),0);
 await p.getByRole('button',{name:'02 想象',exact:true}).click();await p.locator('.static-page-02').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();await p.waitForFunction(()=>Number(document.querySelector('.page02-environment')?.dataset.frames)>2);assert.equal(await p.locator('.page02-environment canvas').count(),1);assert.ok((await p.locator('textarea').inputValue()).includes('自由'));
 assert.deepEqual(errors,[]);const fps=(samples[2].frames-samples[0].frames)/(samples[2].time-samples[0].time);
 await fs.writeFile(`${dir}/results.json`,JSON.stringify({engine,width,height,samples,fps,requests,errors,checks:['t0/t5/t10','stable UI','reduced motion stops','hidden tab stops','input and clarification','navigation disposes','revisit creates one canvas']},null,2));console.log('PASS',engine,width,'frames/sec',fps.toFixed(1));
}finally{await b.close()}
