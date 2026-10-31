import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const engine=process.env.ENGINE||'chromium',base=process.env.STATIC_BASE_URL||'http://localhost:5220';
const sizes=process.env.RESPONSIVE_SIZE?[process.env.RESPONSIVE_SIZE.split('x').map(Number)]:[[375,667],[390,844],[430,932],[768,1024],[1440,900]];
const browser=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}));
try{for(const [width,height] of sizes){
 const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<1024}),p=await c.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url())});
 await p.addInitScript(()=>{window.__inputViewportListeners=0;const vv=window.visualViewport;if(vv){const add=vv.addEventListener.bind(vv),remove=vv.removeEventListener.bind(vv);vv.addEventListener=(t,fn,...args)=>{window.__inputViewportListeners++;return add(t,fn,...args)};vv.removeEventListener=(t,fn,...args)=>{window.__inputViewportListeners--;return remove(t,fn,...args)}}});
 const click=name=>p.getByRole('button',{name,exact:true}).click();
 const pages=[];
 async function ready(n){
  await p.locator(n===1?'.page01-stage':`.static-page-${String(n).padStart(2,'0')}`).waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();await p.waitForFunction(()=>document.querySelector('main')?.dataset.backgroundReady==='true');
  const failures=await p.locator('main').evaluate((main,{width,n})=>{
   const failures=[],box=main.getBoundingClientRect(),image=main.querySelector(':scope>img'),r=image.getBoundingClientRect();
   if(document.documentElement.scrollWidth>innerWidth+1)failures.push('horizontal page overflow');
   if(!image.complete||!image.naturalWidth)failures.push('background unavailable');
   if(width<1024){
    if(Math.abs(r.height-box.height)>1||Math.abs(r.width-box.width)>1||getComputedStyle(image).objectFit!=='cover')failures.push('background separated from scene');
    const overlay=main.querySelector('.scene-ui-overlay').getBoundingClientRect();if(Math.abs(overlay.top-box.top)>1||Math.abs(overlay.height-box.height)>1)failures.push('UI/background coordinate mismatch');
    const selectors='.static-title,.page01-title,.static-copy,.page01-copy,.journey-step,.daily-topic-grid button,.static-entry,.voices-static-finish';
    for(const node of main.querySelectorAll(selectors)){const b=node.getBoundingClientRect();if(b.width&&((b.left<-.5)||(b.right>innerWidth+.5)))failures.push('clipped '+node.className);if(node.matches('button')&&(b.width<43.9||b.height<43.9))failures.push('small tap target '+node.textContent)}
    for(const node of main.querySelectorAll('.static-copy,.page01-copy,h1'))if(node.scrollWidth>node.clientWidth+1)failures.push('text overflow '+node.className);
    for(const node of main.querySelectorAll('textarea'))if(parseFloat(getComputedStyle(node).fontSize)<16)failures.push('input triggers mobile autozoom');
   }
   if(n===6){
    const expected=['不必等到一切如愿，','此刻的你，','已经走在属于自己的路上。'];
    const lines=[...main.querySelectorAll('.mirror-inscription-line')];
    if(JSON.stringify(lines.map(l=>l.textContent))!==JSON.stringify(expected))failures.push('mirror text changed');
    for(const t of main.querySelectorAll('.mirror-inscription-line tspan')){const b=t.getBoundingClientRect();if(b.left<0||b.right>innerWidth||b.top<box.top||b.bottom>box.bottom)failures.push('mirror glyph clipped '+t.textContent)}
    const inscription=main.querySelector('.mirror-inscription-copy').getBoundingClientRect();
    for(const node of main.querySelectorAll('.static-copy,.static-title,.reflection-static-entry,.reflection-static-voice')){const b=node.getBoundingClientRect();if(Math.min(b.right,inscription.right)-Math.max(b.left,inscription.left)>1&&Math.min(b.bottom,inscription.bottom)-Math.max(b.top,inscription.top)>1)failures.push('mirror overlaps '+node.className)}
   }
   if(n===7&&width<1024){
    const words=[...main.querySelectorAll('.voices-static-cloud button')];
    for(let i=0;i<words.length;i++)for(let j=i+1;j<words.length;j++){const a=words[i].getBoundingClientRect(),b=words[j].getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)failures.push('cloud collision '+words[i].textContent+'/'+words[j].textContent)}
    const copy=getComputedStyle(main.querySelector('.static-copy'));if(copy.backgroundColor!=='rgba(0, 0, 0, 0)'||copy.backgroundImage!=='none')failures.push('copy backplate returned');
   }
   return failures;
  },{width,n});
  assert.deepEqual(failures,[],`${engine} ${width}x${height} page${n}`);if(!pages.includes(n))pages.push(n);
 }
 async function dialog(selector){await p.locator(selector).waitFor();const failures=await p.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect(),fail=[];if(r.left<8||r.right>innerWidth-8||r.top<0||r.bottom>innerHeight)fail.push('dialog outside viewport');if(getComputedStyle(e).overflowY!=='auto')fail.push('dialog cannot scroll');for(const b of e.querySelectorAll('button')){const x=b.getBoundingClientRect();if(x.height<44||x.width<44)fail.push('small dialog control')}return fail});assert.deepEqual(failures,[],`${width} dialog ${selector}`)}
 await p.goto(base);await ready(1);assert.equal(await p.evaluate(()=>window.__inputViewportListeners),0);
 await click('开始体验');await ready(2);await p.locator('textarea').fill('自由');await click('构建我的世界');await dialog('.static-clarification');await click('拥有更多自由时间');await click('构建我的世界');await ready(3);
 await click('重新生成');await p.getByRole('status').filter({hasText:'版本 2'}).waitFor();await click('我想调整');await dialog('.ideal-static-adjustment');await p.locator('textarea').fill('柔和的晨光，安静地阅读。');await click('确认调整 ↗');await click('继续探索');await ready(4);
 await click('作息与睡眠');await click('慢慢聊聊');await dialog('.daily-question');await click('晚睡晚起');await click('下一项 / 看见另一种可能');await ready(5);await p.getByRole('slider').fill('4');await click('播放预览');await click('暂停预览');await click('再次与自己相遇');await ready(6);await p.waitForFunction(()=>document.querySelector('.mirror-inscription')?.dataset.mirrorReady==='true');
 await p.locator('textarea').fill('珍惜此刻的自己。');await click('收好此刻的心声');await dialog('.page06-consent-dialog');
 if(width<1024){
  await p.locator('.page06-consent-dialog textarea').focus();await p.waitForFunction(()=>window.__inputViewportListeners===2);await p.setViewportSize({width,height:400});await p.waitForFunction(()=>Math.abs(parseFloat(document.querySelector('.scene-ui-overlay').style.getPropertyValue('--input-viewport-height'))-innerHeight)<2);await dialog('.page06-consent-dialog');await p.setViewportSize({width,height});await p.waitForFunction(()=>Math.abs(parseFloat(document.querySelector('.scene-ui-overlay').style.getPropertyValue('--input-viewport-height'))-innerHeight)<2);
 }
 await click('仅留给自己');await ready(7);assert.equal(await p.evaluate(()=>window.__inputViewportListeners),0);assert.equal(await p.locator('.voices-static-cloud button').count(),18);assert.equal(await p.locator('.voices-static-approved').count(),0);await click('自由');await p.getByText('自由，也可以有属于你的含义。',{exact:true}).waitFor();
 await click('06 自我');await ready(6);assert.equal(await p.locator('textarea').inputValue(),'珍惜此刻的自己。');await click('收好此刻的心声');await click('愿意分享');await ready(7);assert.ok((await p.locator('.voices-static-approved').innerText()).includes('珍惜此刻'));
 await click('02 想象');await ready(2);assert.ok((await p.locator('textarea').inputValue()).includes('自由'));await click('07 尾声');await ready(7);assert.equal(new Set(requests).size,requests.length);assert.equal(requests.length,7);assert.equal(await p.locator('canvas').count(),0);assert.deepEqual(errors,[]);console.log('PASS',engine,`${width}x${height}`,'seven shared scenes, mirror glyphs, touch targets, dialogs, smaller visual viewport, inputs, navigation, sharing, 7 image requests');await c.close();
}}finally{await browser.close()}
