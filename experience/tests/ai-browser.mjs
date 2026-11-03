// Local end-to-end protocol fixtures. This is NOT a successful live AI call.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync,createReadStream,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import worker from '../worker/src.ts';
import {database,baseEnv} from './worker-fixtures.mjs';
const root=process.env.TEST_DIST||'/tmp/flow-ai-browser-dist',dir=mkdtempSync(join(tmpdir(),'flow-e2e-')),DB=database(join(dir,'database.sqlite'));
DB.sqlite.exec(readFileSync(new URL('../worker/migrations/0001_core.sql',import.meta.url),'utf8'));
const seeds=['旅行','成长','健康','自信','独处','稳定','被理解','自由','热爱生活','平衡','财富自由','快乐','探索','热爱','真实','生活品质','希望','安静'];for(const word of seeds){const id=crypto.randomUUID();DB.sqlite.prepare('INSERT INTO submissions VALUES(?,?,?)').run(id,'fixture-seed',Date.now());DB.sqlite.prepare('INSERT INTO wordcloud_entries VALUES(?,?,?,?)').run(crypto.randomUUID(),id,word,Date.now())}

const server=createServer((req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!path.startsWith(root+'/')||!existsSync(path)){res.writeHead(404).end();return}res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.webp')?'image/webp':'text/html');createReadStream(path).pipe(res)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const env={...baseEnv,DB,ALLOWED_ORIGINS:base,TEXT_DAILY_QUOTA:'100',IMAGE_DAILY_QUOTA:'20',TURNSTILE_HOSTNAMES:'127.0.0.1'};
let images=0,shares=0,failImage=false,failModels=false;
const original=globalThis.fetch;
globalThis.fetch=async (url,options)=>{
 const u=String(url);if(u.includes('siteverify'))return Response.json({success:true,hostname:'127.0.0.1',action:'flow_submit'});
 if(failModels)return new Response('{}',{status:503});
 if(u.includes('image-provider')){images++;await new Promise(r=>setTimeout(r,150));if(failImage)return new Response('{}',{status:503});return Response.json({data:[{url:`https://images.example/scene-${images}.webp`}]})}
 const body=JSON.parse(options.body),input=JSON.parse(body.messages[1].content),system=body.messages[0].content;
 let result;if(system.includes('仅审核'))result={approved:input.words};else if(system.includes('返回environment'))result={environment:'森林中的书屋',role:'阅读的人',activities:['阅读'],emotions:['安静'],lifestyle:'慢慢生活',visualElements:['书','树'],explicitFacts:[input.ideal],artisticAdditions:['柔和晨光'],uncertainties:[],questions:[],visual:{subject:'书与树',composition:'16:9',environment:'森林',objects:'书',lighting:'晨光',colors:'绿色',time:'清晨',spatialRelations:'近处书屋远处树林',mood:'平静'},prompt:input.adjustment?'Bright forest library, keep the books.':'A forest library with books, wide landscape.'};else if(system.includes('possibleDifferences'))result={summary:'你向往平静的阅读空间。',possibleDifferences:['日常节奏与愿望也许有所不同。'],uncertainties:['这不是因果判断。']};else if(system.includes('response，keywords'))result={response:'你珍惜阅读的时光，此刻也可以温柔地看待自己。',keywords:['阅读','平静']};else result={keywords:['阅读','平静']};
 return Response.json({choices:[{message:{content:JSON.stringify(result)}}]});
};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{for(const [width,height] of [[320,568],[390,844],[1440,900]]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await context.newPage(),errors=[],api=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:'window.turnstile={render:(h,o)=>(window.__challenge=o,"test"),execute:()=>window.__challenge.callback("fixture-token"),remove:()=>{}}'}));
 await p.route('https://images.example/**',r=>r.fulfill({path:new URL('../src/assets/final-backgrounds/page03.webp',import.meta.url).pathname,contentType:'image/webp'}));
 await p.route('https://api.flow.test/**',async route=>{const req=route.request();api.push(new URL(req.url()).pathname);if(req.url().endsWith('/share'))shares++;const response=await worker.fetch(new Request(req.url(),{method:req.method(),headers:{...req.headers(),'CF-Connecting-IP':`192.0.2.${width%200}`},body:req.method()==='POST'?req.postData():undefined}),env);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()}).catch(()=>{})});
 const click=n=>p.getByRole('button',{name:n,exact:true}).click();const ready=async n=>{await p.locator(n===1?'.page01-stage':`.static-page-${String(n).padStart(2,'0')}`).waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2),false)};
 await p.goto(base);await ready(1);assert.equal(api.length,0);await click('开始体验');await ready(2);await p.locator('textarea').fill('我希望在森林里安静地阅读，与喜欢的人相伴。');await click('构建我的世界');await ready(3);await p.locator('.generated-result img').waitFor();
 const old=await p.locator('.generated-result img').getAttribute('src');failImage=true;await click('重新生成');await p.getByRole('status').filter({hasText:'模型服务暂不可用'}).waitFor();assert.equal(await p.locator('.generated-result img').getAttribute('src'),old);await click('关闭');failImage=false;
 await click('重新生成');await click('取消');await p.waitForTimeout(400);assert.equal(await p.locator('.generated-result img').getAttribute('src'),old,'canceled work must not overwrite the last image');assert.ok(await p.getByRole('button',{name:'重新生成',exact:true}).isEnabled());
 const before=images;await p.getByRole('button',{name:'重新生成',exact:true}).evaluate(b=>{b.click();b.click()});await p.waitForFunction(old=>document.querySelector('.generated-result img')?.getAttribute('src')!==old,old);assert.equal(images,before+1);
 await click('我想调整');await p.locator('textarea').fill('让光线更明亮');await click('确认调整 ↗');await p.locator('.ideal-static-adjustment').waitFor({state:'detached'});await click('继续探索');await ready(4);await p.locator('textarea').fill('我每天读书。');await click('看见另一种可能');await ready(5);await p.getByText('你向往平静的阅读空间。',{exact:false}).waitFor();await click('再次与自己相遇');await ready(6);await p.locator('textarea').fill('愿意继续热爱阅读。');await click('收好此刻的心声');await p.locator('.page06-consent-dialog').waitFor();await click('愿意分享');await ready(7);
 const prior=DB.sqlite.prepare('SELECT COUNT(*) n FROM wordcloud_entries').get().n,priorShares=shares;await p.locator('.cloud-consent').waitFor();assert.equal(shares,priorShares);await click('不愿意分享');assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM wordcloud_entries').get().n,prior);
 await click('分享词语');await p.locator('input[aria-label="分享词语 1"]').fill('陪伴');await click('检查词语');await p.getByText('实际将公开的词语：陪伴、平静').waitFor();assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM wordcloud_entries').get().n,prior);await click('愿意分享');await p.locator('.cloud-consent').waitFor({state:'detached'});await p.getByRole('button',{name:'陪伴',exact:true}).waitFor();assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM wordcloud_entries').get().n,prior+2);assert.equal(shares,priorShares+1);
 assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2),false);const rects=await p.locator('main').evaluate(main=>{const root=main.getBoundingClientRect();return [...main.querySelectorAll('.scene-ui-overlay>*')].filter(e=>getComputedStyle(e).position!=='fixed').map(e=>({name:e.className,r:e.getBoundingClientRect()})).filter(({r})=>r.width&&r.height&&(r.top<root.top-1||r.bottom>root.bottom+1)).map(e=>e.name)});assert.deepEqual(rects,[]);const cloud=await p.locator('.voices-static-cloud').evaluate(e=>{const b=e.getBoundingClientRect();return [...e.querySelectorAll('button')].every(w=>{const r=w.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=b.top-1&&r.bottom<=b.bottom+1})});assert.ok(cloud,'all real-data cloud words fit their reserved area');
 console.log('PASS LOCAL FIXTURES',width,'explicit AI chain, image failure preservation, single regeneration, edit, analysis/reflection, reject=no writes, review+explicit share, real SQLite aggregation');await context.close();
 }
 // Fresh visitor reads the same persistent rows, without any private paragraphs.
 const r=await worker.fetch(new Request('https://api.flow.test/api/wordcloud',{headers:{Origin:base,'CF-Connecting-IP':'192.0.2.250'}}),env);const data=await r.json();assert.equal(data.words.find(w=>w.word==='陪伴').frequency,3);console.log('PASS independent visitor sees accumulated database frequencies; NO live-provider verification claimed');
}finally{await browser.close();globalThis.fetch=original;server.close();DB.sqlite.close();rmSync(dir,{recursive:true,force:true})}
