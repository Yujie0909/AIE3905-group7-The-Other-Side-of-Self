import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const dir='artifacts/refinement',url=process.env.REVIEW_URL||'http://localhost:5174';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const report=process.env.SKIP_DWELL?JSON.parse(await fs.readFile(`${dir}/dwell-results.json`,'utf8')):{pages:[],errors:[],transitions:[],recordings:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const stable=async p=>{await p.locator('.transition-layer.active').waitFor({state:'hidden'});await p.waitForFunction(()=>document.querySelector('canvas')?.dataset.loaded==='true')};
const click=async(p,name)=>{await p.getByRole('button',{name,exact:true}).click();await stable(p)};
const sample=p=>p.evaluate(()=>{const c=document.querySelector('canvas');const tiny=document.createElement('canvas');tiny.width=80;tiny.height=45;const ctx=tiny.getContext('2d');ctx.drawImage(c,0,0,80,45);return {pixels:Array.from(ctx.getImageData(0,0,80,45).data),time:+c.dataset.time,frames:+c.dataset.frames}});
const diff=(a,b)=>a.pixels.reduce((s,v,i)=>s+(i%4===3?0:Math.abs(v-b.pixels[i])),0)/(a.pixels.length/4*3);
const sceneHandle=async p=>p.locator('canvas').elementHandle();
const p=await browser.newPage({viewport:{width:1366,height:768}});p.on('pageerror',e=>report.errors.push(e.message));
await p.goto(url);await stable(p);const canvas=await sceneHandle(p);
// Sample transition at 120ms intervals; validate canvas identity, frame clock and illumination.
await p.evaluate(()=>{window.__frames=[];window.__watch=setInterval(()=>{const c=document.querySelector('canvas');if(!c)return;const ctx=c.getContext('2d'),data=ctx.getImageData(Math.floor(c.width*.7),Math.floor(c.height*.35),1,1).data;window.__frames.push({time:+c.dataset.time,light:+c.dataset.light,brightness:(data[0]+data[1]+data[2])/3})},120)});
async function dwell(n){
 await stable(p);await p.waitForTimeout(900);if(process.env.SKIP_DWELL){await p.screenshot({path:`${dir}/page-${String(n).padStart(2,'0')}.png`});return;}const a=await sample(p);await p.screenshot({path:`${dir}/page-${String(n).padStart(2,'0')}.png`});
 await wait(5000);const b=await sample(p);await wait(25000);const c=await sample(p);
 assert.ok(diff(a,b)>.08,`Page ${n}: perceptible pixel movement`);assert.ok(c.time>a.time+20);assert.ok(await canvas.evaluate(el=>el.isConnected));
 const result={page:n,motionDifference5s:+diff(a,b).toFixed(3),motionDifference30s:+diff(a,c).toFixed(3),observedSeconds:+(c.time-a.time).toFixed(2),renderedFPS:+((c.frames-a.frames)/30).toFixed(1)};
 if(n===1){await wait(30000);const d=await sample(p);result.motionDifference60s=+diff(a,d).toFixed(3);assert.ok(diff(a,d)>.08)}
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 report.pages.push(result);await fs.writeFile(`${dir}/dwell-results.json`,JSON.stringify(report,null,2));console.log('PASS dwell',JSON.stringify(result));
}
await dwell(1);await click(p,'开始体验');await p.locator('textarea').fill('我想有更多自由时间，在安静的空间里阅读与创作。');await dwell(2);
await click(p,'构建我的世界');await p.getByRole('heading',{name:'你好，理想的世界'}).waitFor();await stable(p);await dwell(3);
await click(p,'重新生成 ↻');await click(p,'我想调整 +');await p.locator('textarea').fill('更柔和的晨光');await click(p,'确认调整 ↗');await click(p,'靠近光线 ⤢');await click(p,'靠近光线 ⤢');
await click(p,'继续探索');await p.getByRole('button',{name:'作息与睡眠'}).click();await p.getByRole('button',{name:'兴趣与爱好'}).click();await dwell(4);await click(p,'慢慢聊聊');await click(p,'晚睡晚起');await click(p,'下一项');await click(p,'阅读与学习');await click(p,'看见另一种可能');await dwell(5);
await p.getByText('变化停在这里，留一点时间给自己。').waitFor({timeout:8000});await click(p,'再看一次 ↻');await click(p,'再次与自己相遇');await p.locator('textarea').fill('我希望慢慢来，保留自由和热爱。');await dwell(6);
await click(p,'收好此刻的心声');await p.locator('textarea').fill('慢慢来，也可以有自己的节奏。');await click(p,'愿意分享');await dwell(7);await click(p,'自由');assert.ok(await p.getByText('自由，也可以有属于你的含义。').isVisible());
await click(p,'带着此刻的自己，继续前行');await click(p,'开始体验');assert.equal(await p.locator('textarea').inputValue(),'');await click(p,'退出体验 ↗');
const watch=await p.evaluate(()=>{clearInterval(window.__watch);return window.__frames});
assert.ok(watch.every(x=>x.brightness>8),'no sampled black frames');report.transitionSamples=watch.length;report.minBackgroundBrightness=Math.min(...watch.map(x=>x.brightness));
await click(p,'减弱动效');const r1=await sample(p);await wait(1500);const r2=await sample(p);assert.equal(r1.time,r2.time);report.reducedMotion='clock paused; functionality verified by regression test';await p.close();
// Separate real-time browser screen recordings, not animations synthesized from stills.
async function record(name,prepare,action){
 const context=await browser.newContext({viewport:{width:1366,height:768},recordVideo:{dir:`${dir}/raw`,size:{width:1366,height:768}}});const page=await context.newPage();await page.goto(url);await stable(page);await prepare(page);await wait(1500);const start=Date.now();await action(page);const duration=(Date.now()-start)/1000;const video=page.video();await context.close();const path=await video.path();
 // Start at the recorded action boundary; preserve the initial scene and both transitions.
 const length=name==='05-06-07'?14:12;
 const meta=spawnSync('ffprobe',['-v','quiet','-show_entries','format=duration','-of','csv=p=0',path],{encoding:'utf8'});const total=Number(meta.stdout.trim());
 const out=`${dir}/${name}.mp4`;const enc=spawnSync('ffmpeg',['-y','-ss',String(Math.max(0,total-duration-.2)),'-i',path,'-t',String(length),'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',out],{encoding:'utf8'});assert.equal(enc.status,0,enc.stderr);report.recordings.push({name,path:out,seconds:length,actionSeconds:duration});console.log('PASS recording',name);
}
await record('01-ambient',async()=>{},async page=>{await page.mouse.move(1100,300);await wait(6000);await page.mouse.move(850,500,{steps:40});await wait(6000)});
const to2=async page=>{await click(page,'开始体验');await page.locator('textarea').fill('我希望有自由的时间，安静地阅读和创作。')};
await record('02-03',to2,async page=>{await wait(2500);await click(page,'构建我的世界');await page.getByRole('heading',{name:'你好，理想的世界'}).waitFor();await wait(8500)});
await record('05-06-07',async page=>{await to2(page);await click(page,'构建我的世界');await page.getByRole('button',{name:'继续探索'}).waitFor();await stable(page);await click(page,'继续探索');await click(page,'跳过，继续旅程')},async page=>{await wait(2500);await click(page,'再次与自己相遇');await page.locator('textarea').fill('愿自己慢慢来，依然热爱。');await wait(2200);await click(page,'收好此刻的心声');await wait(1000);await click(page,'愿意分享');await wait(6500)});
assert.deepEqual(report.errors,[]);await fs.writeFile(`${dir}/results.json`,JSON.stringify(report,null,2));await browser.close();
