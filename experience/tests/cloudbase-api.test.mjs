import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApi} from '../cloudbase/api.mjs';
import {fixtureDatabase,cloudEnv,modelFixture} from './cloudbase-fixtures.mjs';
async function start(env,opts){const api=createApi(env,opts);await new Promise(r=>api.listen(0,'127.0.0.1',r));return {api,base:`http://127.0.0.1:${api.address().port}`}}
async function post(base,path,data,token){const response=await fetch(base+path,{method:'POST',headers:{Origin:'https://site.example','Content-Type':'application/json','X-Test-Client-Ip':'192.0.2.1',...(token?{'X-Flow-Token':token}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json()}}
test('CloudBase health does not initialize a DB or model; prefixes, CORS and errors are explicit',async()=>{
 let calls=0;const {api,base}=await start({API_PATH_PREFIX:'/flow-space-api',ALLOWED_ORIGINS:'https://site.example'},{transport:()=>{calls++;throw Error('no startup call')}});
 try{const health=await fetch(base+'/flow-space-api/api/health',{headers:{Origin:'https://site.example'}});assert.equal(health.status,200);assert.equal((await health.json()).platform,'cloudbase');assert.equal(calls,0);
 assert.equal((await fetch(base+'/api/health')).status,200);assert.equal((await fetch(base+'/flow-space-api/api/health',{headers:{Origin:'https://evil.example'}})).status,403);
 const options=await fetch(base+'/flow-space-api/api/text',{method:'OPTIONS',headers:{Origin:'https://site.example'}});assert.equal(options.status,204);assert.match(options.headers.get('Access-Control-Allow-Headers'),/X-Flow-Token/);
 }finally{await api.stopCloud()}
});
test('PostgreSQL transactions persist approved explicit shares, aggregate across visitors and prevent duplicate image billing',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'flow-pg-'));let fixture=await fixtureDatabase(join(dir,'data')),state={calls:0,images:0},server=await start(cloudEnv,{store:fixture.store,transport:modelFixture(state),captcha:async()=>{}});
 try{
 const ticket=randomUUID();const verify=await post(server.base,'/api/verify',{ticket,randstr:'fixture'});assert.equal(verify.status,200);const token=verify.data.token;assert.equal((await post(server.base,'/api/verify',{ticket,randstr:'fixture'})).status,403);
 assert.equal((await post(server.base,'/api/text',{task:'keywords',input:{ideal:'阅读'}},'tampered')).status,403);
 const text=await post(server.base,'/api/text',{task:'keywords',input:{ideal:'阅读'}},token);assert.equal(text.status,200);assert.deepEqual(text.data.result.keywords,['阅读','平静']);
 const image={requestId:randomUUID(),prompt:'A quiet forest library'};assert.equal((await post(server.base,'/api/image',image,token)).status,200);assert.equal((await post(server.base,'/api/image',image,token)).status,200);assert.equal(state.images,1);
 assert.equal((await post(server.base,'/api/image',{...image,prompt:'Different'},token)).status,409);
 const requestId=randomUUID(),words=['阅读','平静'];assert.equal((await post(server.base,'/api/wordcloud/share',{words,requestId,consent:false},token)).status,400);assert.deepEqual(await fixture.store.cloud(),[]);
 const preview=await post(server.base,'/api/wordcloud/preview',{words},token);assert.equal(preview.status,200);const share={...preview.data,requestId,consent:true};
 const results=await Promise.all([post(server.base,'/api/wordcloud/share',share,token),post(server.base,'/api/wordcloud/share',share,token)]);assert.ok(results.every(r=>r.status===200));assert.equal((await fixture.store.cloud()).find(w=>w.word==='阅读').frequency,1);
 await server.api.stopCloud();fixture=await fixtureDatabase(join(dir,'data'));server=await start(cloudEnv,{store:fixture.store,transport:modelFixture(state),captcha:async()=>{}});
 const next=(await post(server.base,'/api/verify',{ticket:randomUUID(),randstr:'fixture'})).data.token;
 assert.equal((await post(server.base,'/api/wordcloud/share',share,next)).data.replayed,true);
 const review=(await post(server.base,'/api/wordcloud/preview',{words:['阅读']},next)).data;
 assert.equal((await post(server.base,'/api/wordcloud/share',{...review,requestId:randomUUID(),consent:true},next)).status,200);
 const publicCloud=await(await fetch(server.base+'/api/wordcloud')).json();assert.equal(publicCloud.words.find(w=>w.word==='阅读').frequency,2);
 }finally{await server.api.stopCloud();rmSync(dir,{recursive:true,force:true})}
});
