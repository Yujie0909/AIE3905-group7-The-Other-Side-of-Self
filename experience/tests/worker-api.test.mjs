import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../worker/src.ts';
import {cleanWords} from '../shared/contracts.ts';
import {database,baseEnv,call,fixtureFetch} from './worker-fixtures.mjs';
test('local Worker health needs no database, API keys or upstream calls',async()=>{const r=await call(baseEnv,'/api/health');assert.equal(r.status,200);assert.equal((await r.json()).databaseConfigured,false)});
test('public keywords reject identifiers, HTML, digits, long text; normalization deduplicates',()=>{assert.deepEqual(cleanWords([' 自由。','自由','平静']),['自由','平静']);for(const w of ['张三13800138000','<script>','我的全部人生经历','user123','家里住址'])assert.throws(()=>cleanWords([w]))});
test('real SQLite transaction persistence, cross-visitor aggregation, retries and privacy',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'flow-d1-test-')),path=join(dir,'cloud.sqlite');const DB=database(path);DB.sqlite.exec(readFileSync(new URL('../worker/migrations/0001_core.sql',import.meta.url),'utf8'));const env={...baseEnv,DB};const original=globalThis.fetch;globalThis.fetch=fixtureFetch;
 try{
  assert.equal((await call(env,'/api/text',{task:'arbitrary',input:{}})).status,400);
  assert.equal((await call(env,'/api/text',{task:'keywords',input:{}},{Origin:'https://evil.example'})).status,403);
  const preview=await call(env,'/api/wordcloud/preview',{words:['自由','平静']});assert.equal(preview.status,200);const approval=await preview.json(),id=crypto.randomUUID();
  assert.equal((await call(env,'/api/wordcloud/share',{...approval,requestId:id,consent:false})).status,400);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM wordcloud_entries').get().n,0);
  const body={...approval,requestId:id,consent:true};assert.equal((await call(env,'/api/wordcloud/share',body)).status,200);assert.equal((await call(env,'/api/wordcloud/share',body)).status,200);
  assert.equal(DB.sqlite.prepare('SELECT COUNT(*) n FROM wordcloud_entries').get().n,2);
  assert.equal((await call(env,'/api/wordcloud/share',{...body,words:['旅行']})).status,409);
  const other=await(await call(env,'/api/wordcloud/preview',{words:['自由']},{'CF-Connecting-IP':'192.0.2.2'})).json();assert.equal((await call(env,'/api/wordcloud/share',{...other,requestId:crypto.randomUUID(),consent:true},{'CF-Connecting-IP':'192.0.2.2'})).status,200);
  DB.sqlite.close();const restarted=database(path);const result=await(await call({...baseEnv,DB:restarted},'/api/wordcloud')).json();assert.equal(result.words.find(w=>w.word==='自由').frequency,2);assert.equal(result.words.find(w=>w.word==='平静').frequency,1);
  const columns=restarted.sqlite.prepare('PRAGMA table_info(wordcloud_entries)').all().map(x=>x.name);assert.deepEqual(columns,['id','submission_id','normalized_word','created_at']);restarted.sqlite.close();
 }finally{globalThis.fetch=original;try{DB.sqlite.close()}catch{}rmSync(dir,{recursive:true,force:true})}
});
test('AI requires real verification and server quota; image job IDs prevent repeat upstream billing',async()=>{
 const DB=database(':memory:');DB.sqlite.exec(readFileSync(new URL('../worker/migrations/0001_core.sql',import.meta.url),'utf8'));const env={...baseEnv,DB,IMAGE_DAILY_QUOTA:'1'};let imageCalls=0;const original=globalThis.fetch;globalThis.fetch=(u,o)=>{if(String(u).includes('image-provider.example'))imageCalls++;return fixtureFetch(u,o)};
 try{
  globalThis.fetch=()=>Promise.resolve(Response.json({success:false}));assert.equal((await call(env,'/api/image',{requestId:crypto.randomUUID(),prompt:'A forest'})).status,403);
  globalThis.fetch=(u,o)=>{if(String(u).includes('image-provider.example'))imageCalls++;return fixtureFetch(u,o)};
  const body={requestId:crypto.randomUUID(),prompt:'A forest'};assert.equal((await call(env,'/api/image',body)).status,200);assert.equal((await call(env,'/api/image',body)).status,200);assert.equal(imageCalls,1);assert.equal((await call(env,'/api/image',{...body,requestId:crypto.randomUUID()})).status,429);assert.equal(imageCalls,1);
 }finally{globalThis.fetch=original;DB.sqlite.close()}
});
