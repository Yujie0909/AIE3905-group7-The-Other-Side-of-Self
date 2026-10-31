import {chromium,webkit} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const engine=process.env.ENGINE||'chromium',width=Number(process.env.WIDTH||1440),height=width===1920?1080:width===390?844:900;
const dir=`artifacts/page02-water/${engine}-${width}`;await fs.mkdir(dir,{recursive:true});
const b=await(engine==='webkit'?webkit.launch():chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']}));
let context;
try{
 context=await b.newContext({viewport:{width,height},recordVideo:process.env.RECORD?{dir:`${dir}/recording`,size:{width,height}}:undefined});
 const videoStart=Date.now(),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(process.env.STATIC_BASE_URL||'http://localhost:5211');await p.getByRole('button',{name:'开始体验',exact:true}).click();await p.locator('.static-page-02').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();
 await p.locator('[data-water-material=ready]').waitFor();
 // Isolate the lake during acceptance: no light streak or cloud motion can
 // accidentally serve as evidence that the water itself is moving.
 await p.locator('.page02-environment').evaluate(e=>{e.dataset.sky='off';e.dataset.mist='off';e.dataset.ribbon='off'});
 await p.waitForTimeout(12000);
 const start=Date.now(),clipStart=(start-videoStart)/1000,samples=[];
 const geometry=()=>p.locator('.static-title,.static-copy,.dream-capture,.static-progress').evaluateAll(es=>es.map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).font,color:getComputedStyle(e).color})));
 const before=await geometry();await p.evaluate(()=>document.activeElement?.blur());await p.mouse.move(2,2);
 for(const t of [0,3,6,10]){
  const wait=t*1000-(Date.now()-start);if(wait>0)await p.waitForTimeout(wait);
  await p.screenshot({path:`${dir}/t-${t}.png`,fullPage:true,caret:'hide'});
  samples.push(await p.locator('.page02-environment').evaluate(e=>{const c=e.querySelector('[data-water-material]');return{time:Number(e.dataset.time),frames:Number(e.dataset.frames),camera:JSON.parse(e.dataset.camera),waterTime:Number(c.dataset.waterTime),waterCamera:JSON.parse(c.dataset.sourceCamera),buffer:[c.width,c.height],rect:c.getBoundingClientRect().toJSON()}}));
 }
 assert.deepEqual(await geometry(),before);assert.ok(samples[3].frames>samples[0].frames+30);
 const opaqueWaterPassed=await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const c=document.querySelector('[data-water-material]'),g=c.getContext('webgl'),cam=JSON.parse(c.dataset.sourceCamera);const alphas=[];for(const[x,y]of[[1000,760],[1300,850],[1550,800]]){const a=new Uint8Array(4),px=Math.floor((x-cam.x)/cam.width*c.width),py=c.height-1-Math.floor((y-cam.y)/cam.height*c.height);if(px<0||px>=c.width||py<0||py>=c.height)continue;g.readPixels(px,py,1,1,g.RGBA,g.UNSIGNED_BYTE,a);alphas.push(a[3])}resolve(alphas.length>0&&alphas.every(x=>x===255))})));
 assert.equal(opaqueWaterPassed,true,'Water interior must replace static pixels with opaque refracted pixels');
 // Pixel proof that the water plate is fully opaque in its interior: hide the
 // original photo for one diagnostic frame, not for normal playback.
 await p.addStyleTag({content:'.static-page-02>.static-environment{visibility:hidden!important}.static-page-02 .scene-ui-overlay{visibility:hidden!important}'});
 await p.screenshot({path:`${dir}/water-plate-only.png`,fullPage:true});
 await p.locator('style').last().evaluate(e=>e.remove());
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);const stopped=await p.locator('.page02-environment').getAttribute('data-frames');await p.waitForTimeout(250);assert.equal(await p.locator('.page02-environment').getAttribute('data-frames'),stopped);
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.locator('textarea').fill('我希望拥有自由时间，阅读和创作。');await p.getByRole('button',{name:'构建我的世界',exact:true}).click();await p.locator('.static-page-03').waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.equal(await p.locator('[data-water-material]').count(),0);assert.equal(await p.locator('canvas').count(),0);
 assert.deepEqual(errors,[]);
 const video=p.video();await p.close();await context.close();context=null;
 if(video){const path=await video.path();execFileSync('ffmpeg',['-y','-ss',String(clipStart),'-i',path,'-t','10','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',`${dir}/lake-10s.mp4`],{stdio:'ignore'});
  if(width>700){const r=samples[0].rect;execFileSync('ffmpeg',['-y','-i',`${dir}/lake-10s.mp4`,'-vf',`crop=${Math.floor(r.width/2)*2}:${Math.floor(r.height/2)*2}:0:${Math.floor(r.top)}`,'-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',`${dir}/lake-detail-10s.mp4`],{stdio:'ignore'})}}
 const fps=(samples[3].frames-samples[0].frames)/(samples[3].time-samples[0].time);
 await fs.writeFile(`${dir}/results.json`,JSON.stringify({engine,width,height,samples,fps,errors,opaqueWaterPassed,video:process.env.RECORD?'lake-10s.mp4':null,checks:['water-only acceptance','four real rendered times','opaque refracted water interior','UI unchanged','reduced motion pauses','navigation disposes water and sky contexts']},null,2));console.log('PASS lake',engine,width,'fps',fps.toFixed(1));
}finally{await context?.close();await b.close()}
