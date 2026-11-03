import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fixtureDatabase} from './cloudbase-fixtures.mjs';
import {cloudBaseRpcStore,databaseConfiguration} from '../cloudbase/rdb-http.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const env={CLOUDBASE_ENV_ID:'flow-space-d9gzw4xiiba0881b3',CLOUDBASE_DB_TYPE:'postgresql',CLOUDBASE_SERVER_API_KEY:'fixture-server-key'};
test('RPC ACL denies anon/authenticated; a rejected multi-write share rolls back all rows and quota',async()=>{
 const f=await fixtureDatabase();
 try{
  for(const role of ['anon','authenticated']){
   await f.sql.exec('SET ROLE '+role);
   await assert.rejects(f.sql.query("SELECT public.flow_backend_rpc('cloud','{}'::jsonb)"),e=>e.code==='42501');
   await assert.rejects(f.sql.query('SELECT * FROM public.flow_wordcloud_words'),e=>e.code==='42501');
   await f.sql.exec('RESET ROLE');
  }
  // The first word is inserted before the invalid second word. Both it and the share/limit must roll back.
  await assert.rejects(f.store.share(randomUUID(),digest('bad-share'),['calm','zzzzz'],digest('visitor')),e=>e.code==='invalid_input');
  assert.deepEqual(await f.store.cloud(),[]);
  assert.equal((await f.sql.query('SELECT count(*)::integer n FROM flow_wordcloud_submissions')).rows[0].n,0);
  assert.equal((await f.sql.query('SELECT count(*)::integer n FROM flow_api_limits')).rows[0].n,0);
  await f.store.quota([['z',1,Date.now()+120000]]);
  await assert.rejects(f.store.quota([['a',1,Date.now()+120000],['z',1,Date.now()+120000]]),e=>e.code==='quota_exceeded');
  assert.equal((await f.sql.query("SELECT count(*)::integer n FROM flow_api_limits WHERE bucket='a'")).rows[0].n,0);
  // Re-running initialization must preserve data.
  await f.store.share(randomUUID(),digest('real-share'),['平静'],digest('next-visitor'));
  await f.sql.exec(readFileSync(new URL('../cloudbase/migrations/0001_core.sql',import.meta.url),'utf8'));
  assert.equal((await f.store.cloud()).find(w=>w.word==='平静').frequency,1);
 }finally{await f.store.close()}
});
test('HTTPS RPC needs only environment and server ApiKey, bounds errors, and never accepts a caller-supplied endpoint',async()=>{
 assert.equal(databaseConfiguration(env),true);assert.equal(databaseConfiguration({...env,CLOUDBASE_SERVER_API_KEY:''}),false);
 assert.equal(databaseConfiguration({...env,CLOUDBASE_ENV_ID:'bad.example/path'}),false);
 let calls=0;
 const s=cloudBaseRpcStore({...env,DATABASE_URL:'ignored',DATABASE_CA_CERT:'ignored'},{transport:async(url,options)=>{
  calls++;assert.equal(url,'https://flow-space-d9gzw4xiiba0881b3.api.tcloudbasegateway.com/v1/rdb/rest/rpc/flow_backend_rpc');assert.equal(options.headers.Authorization,'Bearer fixture-server-key');assert.equal(JSON.parse(options.body).p_operation,'ready');assert.equal(options.redirect,'error');return Response.json({ready:true});
 }});assert.equal(await s.ready(),true);assert.equal(calls,1);await s.close();
 for(const [status,data,code] of [[401,{message:'private-provider-error'},'database_authorization_failed'],[403,{message:'private-key-details'},'database_authorization_failed'],[404,{code:'PGRST202'},'database_initialization_required']]){
  const store=cloudBaseRpcStore(env,{transport:async()=>Response.json(data,{status})});await assert.rejects(store.ready(),e=>e.code===code&&!e.message.includes('private'));await store.close();
 }
});
