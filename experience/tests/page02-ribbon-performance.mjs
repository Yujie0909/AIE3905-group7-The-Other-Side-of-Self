import {chromium} from 'playwright';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),images=[];
 page.on('request',request=>{if(/\.(webp|jpg)(\?|$)/.test(request.url()))images.push(request.url())});
 await page.goto(process.env.STATIC_BASE_URL||'http://localhost:5200');await page.locator('.scene-frame[data-navigation-state=idle]').waitFor();await page.getByRole('button',{name:'开始体验',exact:true}).click();await page.locator('.static-page-02').waitFor();await page.locator('.scene-frame[data-navigation-state=idle]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2000);
 const samples=[];const requestsBefore=images.length;
 for(let round=0;round<3;round++){
  await page.bringToFront();
  samples.push(await page.evaluate(()=>new Promise(resolve=>{
   const state=()=>({hidden:document.hidden,visibility:document.visibilityState,motion:document.querySelector('[data-scene-motion]').dataset.motionState,navigation:document.querySelector('.scene-frame').dataset.navigationState}),initialState=state(),times=[],start=performance.now();function frame(t){times.push(t);if(t-start<4000)requestAnimationFrame(frame);else{const intervals=times.slice(1).map((v,i)=>v-times[i]).sort((a,b)=>a-b);resolve({frames:times.length,rafPerSecond:(times.length-1)*1000/(times.at(-1)-times[0]),p95IntervalMs:intervals[Math.floor(intervals.length*.95)],maxIntervalMs:Math.max(...intervals),over33ms:intervals.filter(v=>v>33.5).length,initialState,finalState:state(),stats:JSON.parse(document.querySelector('[data-scene-motion]').dataset.motionStats||'null')})}}requestAnimationFrame(frame);
  })));
 }
 assert.equal(images.length,requestsBefore,'Continuous ribbon must not request new images');
 const result={method:'Three 4 second Linux Chromium headless rAF scheduling windows, no screenshot/recording; not physical GPU fps',medianRafPerSecond:samples.map(s=>s.rafPerSecond).sort((a,b)=>a-b)[1],samples,requestsDuringMeasurement:images.length-requestsBefore,images,capabilities:await page.evaluate(()=>({logicalCores:navigator.hardwareConcurrency,deviceMemory:navigator.deviceMemory}))};
 await fs.writeFile('artifacts/page02-ribbon/performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}
