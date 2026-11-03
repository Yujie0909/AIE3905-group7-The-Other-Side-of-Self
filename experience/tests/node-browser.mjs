// Actual Vite proxy + Node HTTP + SQLite + Chromium. Providers are explicit test fixtures.
// Never interpret this as live DeepSeek/Seedream success.
import {createServer as createVite} from 'vite';
import {chromium} from 'playwright';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {createLocalApi} from '../server/index.mjs';
const dir=mkdtempSync(join(tmpdir(),'flow-node-browser-'));
const vite=await createVite({server:{host:'127.0.0.1'}});await vite.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let api;
try{for(const width of [390,1440]){
 let calls=0,images=0,failImage=false;
 const env={LOCAL_DB_PATH:join(dir,`${width}.sqlite`),DEEPSEEK_API_KEY:'fixture',DEEPSEEK_BASE_URL:'https://text.example',DEEPSEEK_MODEL:'fixture',ARK_API_KEY:'fixture',ARK_BASE_URL:'https://image.example',ARK_IMAGE_MODEL:'fixture',ARK_IMAGE_HOSTS:'images.example'};
 const transport=async(url,options)=>{
  calls++;const payload=JSON.parse(options.body);
  if(String(url).includes('/images/')){images++;await new Promise((resolve,reject)=>{const done=()=>{options.signal.removeEventListener('abort',abort);resolve()};const timer=setTimeout(done,250);const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))};options.signal.addEventListener('abort',abort,{once:true});if(options.signal.aborted)abort()});if(failImage)return new Response('{}',{status:503});return Response.json({data:[{url:`https://images.example/${images}.webp`}]})}
  const input=JSON.parse(payload.messages[1].content),system=payload.messages[0].content;let result;
  if(input.words)result={approved:input.words};
  else if(system.includes('返回environment'))result={environment:'森林',role:'阅读的人',activities:['阅读'],emotions:['安静'],lifestyle:'慢生活',visualElements:['树','书'],explicitFacts:[input.ideal],artisticAdditions:['柔和晨光'],uncertainties:[],questions:[],visual:{subject:'阅读空间',composition:'16:9',environment:'树林',objects:'书',lighting:'晨光',colors:'绿色',time:'清晨',spatialRelations:'近处书屋，远处森林',mood:'安静'},prompt:input.adjustment?'A bright forest library with books':'A quiet forest library with books'};
  else if(system.includes('possibleDifferences'))result={summary:'你珍惜阅读的时间。',possibleDifferences:['日常节奏可能不同。'],uncertainties:['不能据此推断原因。']};
  else if(system.includes('response，keywords'))result={response:'你珍惜阅读，也在认真生活。',keywords:['阅读','平静']};
  else result={keywords:['阅读','平静']};
  return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
 };
 api=createLocalApi(env,{transport});await new Promise(r=>api.listen(8788,'127.0.0.1',r));
 const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'}),p=await context.newPage(),errors=[],thirdParty=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.url().includes('cloudflare.com'))thirdParty.push(r.url())});
 await p.route('https://images.example/**',r=>r.fulfill({path:new URL('../src/assets/final-backgrounds/page03.webp',import.meta.url).pathname,contentType:'image/webp'}));
 const click=name=>p.getByRole('button',{name,exact:true}).click();
 const ready=async n=>{await p.locator(n===1?'.page01-stage':`.static-page-${String(n).padStart(2,'0')}`).waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2),false)};
 await p.goto('http://127.0.0.1:5173');await ready(1);assert.equal(calls,0);await click('开始体验');await ready(2);
 await p.locator('textarea').fill('我希望在森林里的书屋安静阅读。');await click('构建我的世界');await ready(3);await p.locator('.generated-result img').waitFor();assert.equal(images,1);
 const old=await p.locator('.generated-result img').getAttribute('src');failImage=true;await click('重新生成');await p.getByRole('status').filter({hasText:'模型服务暂不可用'}).waitFor();assert.equal(await p.locator('.generated-result img').getAttribute('src'),old);await click('关闭');failImage=false;
 await click('重新生成');await click('取消');await p.waitForTimeout(400);assert.equal(await p.locator('.generated-result img').getAttribute('src'),old);
 const before=images;await p.getByRole('button',{name:'重新生成',exact:true}).evaluate(b=>{b.click();b.click()});await p.waitForFunction(old=>document.querySelector('.generated-result img')?.getAttribute('src')!==old,old);assert.equal(images,before+1);
 await click('我想调整');await p.locator('textarea').fill('让光线更明亮');await click('确认调整 ↗');await p.locator('.ideal-static-adjustment').waitFor({state:'detached'});
 assert.notEqual(await p.locator('.generated-result img').getAttribute('src'),old);
 await click('继续探索');await ready(4);await p.locator('textarea').fill('每天阅读，也会忙于工作。');await click('看见另一种可能');await ready(5);
 await p.getByText('你珍惜阅读的时间。',{exact:false}).waitFor();await click('再次与自己相遇');await ready(6);await p.locator('textarea').fill('愿意继续热爱阅读。');await click('收好此刻的心声');await p.locator('.page06-consent-dialog').waitFor();await click('愿意分享');await ready(7);
 await p.locator('.cloud-consent').waitFor();await click('不愿意分享');assert.deepEqual((await (await fetch('http://127.0.0.1:8788/api/wordcloud')).json()).words,[]);
 await click('分享词语');await click('检查词语');await p.getByText('实际将公开的词语：阅读、平静').waitFor();await click('愿意分享');await p.locator('.cloud-consent').waitFor({state:'detached'});await p.getByRole('button',{name:'阅读',exact:true}).waitFor();
 assert.equal((await (await fetch('http://127.0.0.1:8788/api/wordcloud')).json()).words.find(w=>w.word==='阅读').frequency,1);
 assert.deepEqual(errors,[]);assert.deepEqual(thirdParty,[]);console.log('PASS LOCAL FIXTURES',width,'Vite proxy, Node auth, seven pages, image preservation on failure, adjustment, explicit share, no Turnstile, no startup AI');
 await context.close();await new Promise(r=>api.close(r));api=undefined;
}}finally{await browser.close();if(api)await new Promise(r=>api.close(r));await vite.close();rmSync(dir,{recursive:true,force:true})}
