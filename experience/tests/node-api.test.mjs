// Local HTTP + real SQLite tests; upstream responses are fixtures, NOT live model evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createLocalApi} from '../server/index.mjs';

const origin='http://localhost:5173';
async function start(env,transport){const server=createLocalApi(env,{transport});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,base:`http://127.0.0.1:${server.address().port}`,stop:()=>new Promise(r=>server.close(r))}}
async function session(base){const r=await fetch(base+'/api/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Flow-Local':'1'},body:'{}'});assert.equal(r.status,200);return {'Content-Type':'application/json',Origin:origin,Cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':(await r.json()).csrf}}
const configured={DEEPSEEK_API_KEY:'fixture-not-a-secret',DEEPSEEK_BASE_URL:'https://text.example',DEEPSEEK_MODEL:'fixture-text',ARK_API_KEY:'fixture-not-a-secret',ARK_BASE_URL:'https://image.example/v3',ARK_IMAGE_MODEL:'fixture-image',ARK_IMAGE_HOSTS:'images.example'};

test('Node health is immediate without keys; local auth rejects foreign sites and missing CSRF; upstream is idle on startup',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'flow-node-'));let calls=0;const api=await start({LOCAL_DB_PATH:join(dir,'data.sqlite')},async()=>{calls++;throw Error('must not run')});
 try{
  const r=await fetch(api.base+'/api/health');assert.equal(r.status,200);const j=await r.json();assert.equal(j.ok,true);assert.equal(j.textConfigured,false);assert.equal(calls,0);
  assert.equal((await fetch(api.base+'/api/session',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json','X-Flow-Local':'1'},body:'{}'})).status,403);
  assert.equal((await fetch(api.base+'/api/text',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'})).status,403);
  const headers=await session(api.base);const r2=await fetch(api.base+'/api/text',{method:'POST',headers,body:JSON.stringify({task:'keywords',input:{ideal:'自由阅读'}})});assert.equal(r2.status,503);assert.equal((await r2.json()).error,'text_not_configured');assert.equal(calls,0);
  assert.equal((await fetch(api.base+'/api/health')).status,200);
 }finally{await api.stop();rmSync(dir,{recursive:true,force:true})}
});

test('Node adapters validate model JSON, image retries are idempotent, explicit reviewed shares persist across restarts',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'flow-node-')),env={...configured,LOCAL_DB_PATH:join(dir,'data.sqlite')};let imageCalls=0,failImage=false;
 const transport=async(url,options)=>{const payload=JSON.parse(options.body);if(String(url).includes('/images/')){imageCalls++;assert.equal(payload.n,1);assert.equal(payload.model,'fixture-image');return failImage?new Response('{}',{status:500}):Response.json({data:[{url:'https://images.example/temporary.webp'}]})}
 const input=JSON.parse(payload.messages[1].content);return Response.json({choices:[{message:{content:JSON.stringify(input.words?{approved:input.words}:{keywords:['阅读']})}}]})};
 let api=await start(env,transport);
 try{
  let headers=await session(api.base);const post=async(path,data)=>{const r=await fetch(api.base+path,{method:'POST',headers,body:JSON.stringify(data)});return {status:r.status,data:await r.json()}};
  assert.deepEqual((await post('/api/text',{task:'keywords',input:{ideal:'阅读'}})).data.result,{keywords:['阅读']});
  const image={prompt:'A quiet reading room',requestId:randomUUID()};assert.equal((await post('/api/image',image)).status,200);assert.equal((await post('/api/image',image)).status,200);assert.equal(imageCalls,1);
  assert.equal((await post('/api/image',{...image,prompt:'Different'})).status,409);
  failImage=true;assert.equal((await post('/api/image',{...image,requestId:randomUUID()})).status,502);
  const requestId=randomUUID(),words=['阅读','平静'];assert.equal((await post('/api/wordcloud/share',{requestId,words,consent:false})).status,400);assert.deepEqual((await (await fetch(api.base+'/api/wordcloud')).json()).words,[]);
  const preview=await post('/api/wordcloud/preview',{words});assert.equal(preview.status,200);
  const share={...preview.data,requestId,consent:true};assert.equal((await post('/api/wordcloud/share',share)).data.saved,true);assert.equal((await post('/api/wordcloud/share',share)).data.replayed,true);
  await api.stop();api=await start(env,transport);headers=await session(api.base);
  const rows=(await (await fetch(api.base+'/api/wordcloud')).json()).words;assert.equal(rows.find(w=>w.word==='阅读').frequency,1);
  assert.equal((await post('/api/wordcloud/share',share)).data.replayed,true);
  const review2=await post('/api/wordcloud/preview',{words:['阅读']});assert.equal((await post('/api/wordcloud/share',{...review2.data,requestId:randomUUID(),consent:true})).status,200);
  assert.equal((await (await fetch(api.base+'/api/wordcloud')).json()).words.find(w=>w.word==='阅读').frequency,2);
 }finally{await api.stop();rmSync(dir,{recursive:true,force:true})}
});
