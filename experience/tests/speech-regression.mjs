import {chromium} from 'playwright';
import assert from 'node:assert/strict';

// Real browser media APIs with Chromium's virtual microphone. No recognition
// result injection: capture/lifecycle tests do NOT prove real hardware or ASR.
const base=process.env.STATIC_BASE_URL||'http://localhost:5220';
const launch=virtual=>chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox',...(virtual?['--use-fake-device-for-media-stream']:[])]});
const button=(p,name)=>p.getByRole('button',{name,exact:true});
async function ready(p,n){await p.locator(n===1?'.page01-stage':`.static-page-${String(n).padStart(2,'0')}`).waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor()}
async function enter(p){await p.goto(base);await ready(p,1);await button(p,'开始体验').click();await ready(p,2)}
async function instrument(c,unsupported=false,delay=false){
 await c.addInitScript(({unsupported,delay})=>{
  if(unsupported){Object.defineProperty(window,'SpeechRecognition',{value:undefined,configurable:true});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined,configurable:true})}
  window.__audio={calls:0,streams:[]};
  const real=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=async constraints=>{
   window.__audio.calls++;const stream=await real(constraints);window.__audio.streams.push(stream);
   if(delay)await new Promise(resolve=>window.__releaseAudio=resolve);
   return stream;
  };
 },{unsupported,delay});
}
async function allStopped(p){await p.waitForFunction(()=>window.__audio.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')))}
async function capture(p){await button(p,'开始语音输入').click();await p.locator('.voice-input[data-voice-state=recording]').waitFor();assert.ok(await p.evaluate(()=>window.__audio.streams.at(-1).getAudioTracks().some(t=>t.readyState==='live')))}
async function visibleStatus(p){const a=await p.locator('.voice-input small').evaluate(e=>{const r=e.getBoundingClientRect(),t=document.querySelector('textarea').getBoundingClientRect();return {visible:getComputedStyle(e).visibility==='visible',fits:r.left>=0&&r.right<=innerWidth,beforeInput:r.bottom<=t.top}});assert.deepEqual(a,{visible:true,fits:true,beforeInput:true})}
const b=await launch(true);
try{
 for(const width of [1440,390]){
  const c=await b.newContext({permissions:['microphone'],viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});await instrument(c,true);
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await enter(p);assert.equal(await p.evaluate(()=>window.__audio.calls),0,'No microphone on mount');
  for(const n of [2,4,6]){
   await p.locator('textarea').fill(`第${n}页已有文字`);const prefix=await p.locator('textarea').inputValue();
   await capture(p);await visibleStatus(p);assert.equal(await p.locator('textarea').inputValue(),prefix,'Capture-only never fabricates a transcript');
   await button(p,'停止语音输入').click();await allStopped(p);
   await capture(p);await p.locator('textarea').fill(`第${n}页手动修改，语音不会覆盖。`);await allStopped(p);assert.equal(await p.locator('.voice-input').getAttribute('data-voice-state'),'idle');
   await capture(p);
   if(n===2){await button(p,'构建我的世界').click();await ready(p,3);await allStopped(p);await button(p,'继续探索').click();await ready(p,4)}
   if(n===4){await button(p,'作息与睡眠').click();await button(p,'慢慢聊聊').click();await p.locator('.daily-question').waitFor();await button(p,'晚睡晚起').click();await button(p,'下一项 / 看见另一种可能').click();await ready(p,5);await allStopped(p);await button(p,'再次与自己相遇').click();await ready(p,6)}
   if(n===6){await button(p,'收好此刻的心声').click();await p.locator('.page06-consent-dialog').waitFor();await allStopped(p);await button(p,'仅留给自己').click();await ready(p,7)}
  }
  for(const [label,n] of [['02 想象',2],['04 现状',4],['06 自我',6]]){await button(p,label).click();await ready(p,n);assert.equal(await p.locator('textarea').inputValue(),`第${n}页手动修改，语音不会覆盖。`)}
  assert.deepEqual(errors,[]);console.log('PASS real virtual-device capture, stop, edit, navigation/unmount cleanup and independent input state:',width);await c.close();
 }
 // Browser permission denial, not a mocked speech error.
 {
  const c=await b.newContext({reducedMotion:'reduce'});await instrument(c,true);const p=await c.newPage();await enter(p);const client=await c.newCDPSession(p);await client.send('Browser.setPermission',{permission:{name:'microphone'},setting:'denied',origin:new URL(base).origin});await button(p,'开始语音输入').click();await p.getByRole('status').filter({hasText:'权限被拒绝'}).waitFor();assert.equal(await p.evaluate(()=>window.__audio.calls),0);await p.locator('textarea').fill('拒绝权限后仍然可以通过文字继续。');assert.ok(await button(p,'构建我的世界').isEnabled());console.log('PASS browser microphone permission denied + keyboard fallback');await c.close();
 }
 // Load the same build under an untrusted HTTP origin using local routing.
 {
  const c=await b.newContext({reducedMotion:'reduce'}),p=await c.newPage();
  // The existing session scaffold uses secure-only randomUUID before mounting.
  // Supply a test session ID here; keep the browser's security/media APIs real.
  await p.addInitScript(()=>{if(!crypto.randomUUID)crypto.randomUUID=()=>'00000000-0000-4000-8000-000000000001'});
  await p.route('http://insecure.flow.test/**',async route=>{const url=new URL(route.request().url());const response=await c.request.get(base+url.pathname+url.search);await route.fulfill({response})});
  await p.goto('http://insecure.flow.test/');await ready(p,1);await button(p,'开始体验').click();await ready(p,2);assert.equal(await p.evaluate(()=>isSecureContext),false);await button(p,'开始语音输入').click();await p.getByRole('status').filter({hasText:'HTTPS 安全连接'}).waitFor();await p.locator('textarea').fill('非安全连接下仍可使用文字。');assert.ok(await button(p,'构建我的世界').isEnabled());console.log('PASS genuine insecure-origin browser context + keyboard fallback');await c.close();
 }
 // Consent refused: no microphone opened. Then attempt actual native ASR;
 // never generate test transcripts or interpret an error as ASR success.
 {
  const c=await b.newContext({permissions:['microphone'],reducedMotion:'reduce'});await instrument(c);const p=await c.newPage();await enter(p);
  const supported=await p.evaluate(()=>!!(window.SpeechRecognition||window.webkitSpeechRecognition));
  if(supported){p.once('dialog',d=>d.dismiss());await button(p,'开始语音输入').click();assert.equal(await p.evaluate(()=>window.__audio.calls),0);p.once('dialog',d=>d.accept());await button(p,'开始语音输入').click();await p.waitForTimeout(6000);if(await button(p,'停止语音输入').count())await button(p,'停止语音输入').click();await p.locator('.voice-input[data-voice-state=error],.voice-input[data-voice-state=success]').waitFor({timeout:7000});await allStopped(p);console.log('ACTUAL native ASR attempt (virtual input, no physical microphone):',await p.locator('.voice-input small').innerText())}
  else console.log('LIMITATION: native ASR not exposed by this Chromium build');await c.close();
 }
 // User cancels while the real device request is still resolving. Late tracks
 // must be stopped rather than resurrecting a canceled session.
 {
  const c=await b.newContext({permissions:['microphone'],reducedMotion:'reduce'});await instrument(c,true,true);const p=await c.newPage();await enter(p);await button(p,'开始语音输入').click();await p.waitForFunction(()=>!!window.__releaseAudio);await button(p,'停止语音输入').click();await p.evaluate(()=>window.__releaseAudio());await allStopped(p);assert.equal(await p.locator('.voice-input').getAttribute('data-voice-state'),'idle');console.log('PASS cancellation cleans late-resolving real capture');await c.close();
 }
}finally{await b.close()}
// No virtual device here: this cloud machine genuinely has no physical mic.
const physical=await launch(false);
try{const c=await physical.newContext({permissions:['microphone'],reducedMotion:'reduce'});await instrument(c,true);const p=await c.newPage();await enter(p);await button(p,'开始语音输入').click();await p.locator('.voice-input[data-voice-state=error]').waitFor();assert.match(await p.locator('.voice-input small').innerText(),/未检测到可用麦克风/);assert.equal(await p.evaluate(()=>window.__audio.streams.length),0);console.log('PASS real device absence reported; real hardware/Chinese transcription remain unverified')}finally{await physical.close()}
