// Real Chromium -> native CloudBase HTTP handler -> embedded PostgreSQL.
// Tencent captcha and upstream models are explicit fixtures, never live-provider proof.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {createReadStream,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {createApi} from '../cloudbase/api.mjs';
import {fixtureDatabase,cloudEnv,modelFixture} from './cloudbase-fixtures.mjs';
const root='/tmp/flow-ai-browser-dist',dir=mkdtempSync(join(tmpdir(),'flow-cb-browser-'));
const site=createServer((req,res)=>{const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+'/')||!existsSync(file)){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html');createReadStream(file).pipe(res)});
await new Promise(r=>site.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${site.address().port}`;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let api;
try{for(const [width,height] of [[320,568],[390,844],[1440,900]]){
 const fixture=await fixtureDatabase(join(dir,String(width))),state={calls:0,images:0};
 api=createApi({...cloudEnv,ALLOWED_ORIGINS:base},{store:fixture.store,transport:modelFixture(state),captcha:async()=>{}});await new Promise(r=>api.listen(0,'127.0.0.1',r));const apiBase=`http://127.0.0.1:${api.address().port}`;
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://turing.captcha.qcloud.com/**',r=>r.fulfill({contentType:'text/javascript',body:'window.TencentCaptcha=class{constructor(id,callback){this.callback=callback}show(){this.callback({ret:0,ticket:crypto.randomUUID(),randstr:"fixture"})}destroy(){}}'}));
 await p.route('https://images.example/**',r=>r.fulfill({path:new URL('../src/assets/final-backgrounds/page03.webp',import.meta.url).pathname,contentType:'image/webp'}));
 await p.route('https://api.flow.test/**',async route=>{const request=route.request(),url=new URL(request.url());const response=await fetch(apiBase+url.pathname,{method:request.method(),headers:{...request.headers(),origin:base,'x-test-client-ip':'192.0.2.1'},body:request.method()==='POST'?request.postData():undefined});if(!response.ok)console.log('FIXTURE ERROR',url.pathname,response.status,await response.clone().text());await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()}).catch(()=>{})});
 const click=n=>p.getByRole('button',{name:n,exact:true}).click(),ready=async n=>{await p.locator(n===1?'.page01-stage':`.static-page-${String(n).padStart(2,'0')}`).waitFor();await p.locator('.scene-frame[data-navigation-state=idle]').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2),false)};
 await p.goto(base);await ready(1);assert.equal(state.calls,0);await click('开始体验');await ready(2);await p.locator('textarea').fill('我希望在森林里安静阅读，与喜欢的人相伴。');await click('构建我的世界');await ready(3).catch(async e=>{console.log('FIXTURE STATUS',await p.getByRole('status').allTextContents(),'model calls',state.calls);throw e});await p.locator('.generated-result img').waitFor();
 const old=await p.locator('.generated-result img').getAttribute('src');state.failImage=true;await click('重新生成');await p.getByRole('status').filter({hasText:'模型服务暂不可用'}).waitFor();assert.equal(await p.locator('.generated-result img').getAttribute('src'),old);await click('关闭');state.failImage=false;
 await click('重新生成');await click('取消');await p.waitForTimeout(300);assert.equal(await p.locator('.generated-result img').getAttribute('src'),old);
 const before=state.images;await p.getByRole('button',{name:'重新生成',exact:true}).evaluate(b=>{b.click();b.click()});await p.waitForFunction(old=>document.querySelector('.generated-result img')?.getAttribute('src')!==old,old);assert.equal(state.images,before+1);
 await click('我想调整');await p.locator('textarea').fill('希望光线更明亮');await click('确认调整 ↗');await p.locator('.ideal-static-adjustment').waitFor({state:'detached'});await click('继续探索');await ready(4);await p.locator('textarea').fill('每天读书，也忙于工作。');await click('看见另一种可能');await ready(5);await p.getByText('你珍惜阅读的时间。',{exact:false}).waitFor();await click('再次与自己相遇');await ready(6);await p.locator('textarea').fill('继续温柔地热爱阅读。');await click('收好此刻的心声');await p.locator('.page06-consent-dialog').waitFor();await click('愿意分享');await ready(7);
 await p.locator('.cloud-consent').waitFor();await click('不愿意分享');assert.deepEqual(await fixture.store.cloud(),[]);
 await click('分享词语');await p.locator('input[aria-label="分享词语 1"]').fill('陪伴');await click('检查词语');await p.getByText('实际将公开的词语：陪伴、平静').waitFor();assert.deepEqual(await fixture.store.cloud(),[]);await click('愿意分享');await p.locator('.cloud-consent').waitFor({state:'detached'});await p.getByRole('button',{name:'陪伴',exact:true}).waitFor();assert.equal((await fixture.store.cloud()).find(w=>w.word==='陪伴').frequency,1);
 const visitor=await(await fetch(apiBase+'/api/wordcloud')).json();assert.equal(visitor.words.find(w=>w.word==='陪伴').frequency,1);assert.deepEqual(errors,[]);console.log('PASS CLOUDBASE FIXTURES',width,'seven pages, real PostgreSQL SQL, image retry/cancel/edit, explicit consent, cross-visitor aggregation; NOT a live-cloud/API check');
 await context.close();await api.stopCloud();api=undefined;
}}finally{await browser.close();if(api)await api.stopCloud();await new Promise(r=>site.close(r));rmSync(dir,{recursive:true,force:true})}
