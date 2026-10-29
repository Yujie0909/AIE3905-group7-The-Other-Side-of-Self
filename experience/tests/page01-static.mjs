import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const root='artifacts/page01-static',url=process.env.PAGE01_URL||'http://localhost:5174';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const report={viewports:[],errors:[],functionalChecks:[]};
try{
 for(const [width,height] of [[1672,941],[1920,1080],[1440,900],[1366,768],[390,844]]){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'no-preference'});p.on('pageerror',e=>report.errors.push(e.message));
  await p.addInitScript(()=>{window.__rafCalls=0;const original=window.requestAnimationFrame;window.requestAnimationFrame=function(fn){window.__rafCalls++;return original.call(window,fn)}});
  await p.goto(url);await p.getByRole('heading',{name:'欢迎进入心流空间',exact:true}).waitFor();await p.locator('.page01-environment').evaluate(im=>im.decode());await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.locator('canvas').count(),0,'Page 1 does not mount the animated renderer');
  assert.equal(await p.locator('.page01-progress li').count(),7);assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const first=await p.screenshot({path:`${root}/page01-${width}.png`});
  const before=await p.evaluate(()=>window.__rafCalls);await p.waitForTimeout(width===1672?3000:300);const second=await p.screenshot();assert.ok(first.equals(second),'Rendered page remains pixel-identical while idle');assert.equal(await p.evaluate(()=>window.__rafCalls),before,'No continuous requestAnimationFrame loop');
  const bounds=await p.locator('.page01-start').boundingBox();assert.ok(bounds.y+bounds.height<height);report.viewports.push({width,height,staticPixelMatch:true,activeAnimations:0,canvasCount:0,progressNodes:7});await p.close();console.log(`PASS Page 01 static ${width}x${height}`);
 }
 const p=await b.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);
 const click=async name=>{await p.getByRole('button',{name,exact:true}).click()};
 await click('开始体验');await p.locator('textarea').fill('我希望拥有自由时间，在安静的空间阅读与创作。');await click('构建我的世界');await p.getByRole('heading',{name:'你好，理想的世界'}).waitFor();await click('我想调整 +');await p.locator('textarea').fill('更柔和的晨光');await click('确认调整 ↗');await click('继续探索');await p.getByRole('button',{name:'作息与睡眠'}).click();await click('慢慢聊聊');await click('晚睡晚起');await click('看见另一种可能');await p.getByRole('heading',{name:'当一切趋于完美'}).waitFor();await click('再次与自己相遇');await p.locator('textarea').fill('慢慢来，保留热爱。');await click('收好此刻的心声');await click('愿意分享');await p.getByRole('heading',{name:'你并不孤单'}).waitFor();await click('自由');await p.getByText('自由，也可以有属于你的含义。').waitFor();await click('带着此刻的自己，继续前行');await p.getByRole('heading',{name:'欢迎进入心流空间'}).waitFor();assert.equal(await p.locator('canvas').count(),0);await click('开始体验');assert.equal(await p.locator('textarea').inputValue(),'');await p.close();
 report.functionalChecks=['Page 1 start opens Page 2','Pages 2–7 text/adjustment/habits/reflection/consent/word cloud pass','Exit returns to static Page 1 and clears session'];assert.deepEqual(report.errors,[]);await fs.writeFile(root+'/results.json',JSON.stringify(report,null,2));console.log('PASS Pages 2–7 regression and reset');
}finally{await b.close()}
