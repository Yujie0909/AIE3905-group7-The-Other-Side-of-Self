import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='artifacts/page02-ribbon/video';await fs.mkdir(`${dir}/frames`,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(process.env.STATIC_BASE_URL||'http://localhost:5200');await page.locator('.scene-frame[data-navigation-state=idle]').waitFor();
 await page.getByRole('button',{name:'开始体验',exact:true}).click();await page.locator('.static-page-02').waitFor();await page.locator('.scene-frame[data-navigation-state=idle]').waitFor();
 await page.locator('[data-motion-state=running]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.mouse.move(3,3);await page.evaluate(()=>document.activeElement?.blur());
 const cdp=await page.context().newCDPSession(page),frames=[],writes=[];
 cdp.on('Page.screencastFrame',event=>{
  const file=`frame-${String(frames.length).padStart(5,'0')}.jpg`;frames.push({file,t:event.metadata.timestamp});
  writes.push(fs.writeFile(`${dir}/frames/${file}`,Buffer.from(event.data,'base64')));
  void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
 });
 await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:1280,maxHeight:800,everyNthFrame:1});await page.waitForTimeout(13000);await cdp.send('Page.stopScreencast');await Promise.all(writes);
 assert.ok(frames.length>70);assert.ok(frames.at(-1).t-frames[0].t>12);
 const manifest=frames.map((frame,i)=>`file '${frame.file}'\nduration ${Math.max(.016,(frames[i+1]?.t??frame.t+.06)-frame.t).toFixed(5)}`).join('\n')+`\nfile '${frames.at(-1).file}'\n`;
 await fs.writeFile(`${dir}/frames/concat.txt`,manifest);
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',`${dir}/frames/concat.txt`,'-vf','fps=30,format=yuv420p','-c:v','libx264','-crf','18','-preset','fast','-movflags','+faststart',`${dir}/page02-ribbon.mp4`]);
 await fs.writeFile(`${dir}/results.json`,JSON.stringify({method:'Actual Chromium CDP screencast, real capture timestamps; 30 fps encode does not imply 30 physical displayed fps',viewport:{width:1440,height:900},recordedSeconds:frames.at(-1).t-frames[0].t,frames:frames.length,timestamps:frames},null,2));
 console.log('PASS actual 13 second Page02 recording',frames.length,'frames');await cdp.detach();
}finally{await browser.close()}
