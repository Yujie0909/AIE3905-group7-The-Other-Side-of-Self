import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {checkApi} from '../worker/check-api.mjs';
test('deployment check rejects placeholder health and incomplete bindings without invoking AI',async()=>{
 const env={VITE_API_BASE_URL:'https://api.example',VITE_TURNSTILE_SITE_KEY:'public-fixture'};let calls=0;
 await assert.rejects(checkApi(env,async()=>{calls++;return new Response('Hello World!')}),/not JSON/);assert.equal(calls,1);
 await assert.rejects(checkApi(env,async()=>Response.json({ok:true,databaseConfigured:false})),/not ready/);
 const urls=[];const headers={'Access-Control-Allow-Origin':'https://yujie0909.github.io','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Turnstile-Token'};
 const result=await checkApi(env,async(url,options)=>{urls.push([url,options.method||'GET']);return options.method==='OPTIONS'?new Response(null,{status:204,headers}):Response.json({ok:true,textConfigured:true,imageConfigured:true,databaseConfigured:true,verificationConfigured:true,configurationIssues:[]},{headers})});
 assert.equal(result.ready,true);assert.deepEqual(urls,[['https://api.example/api/health','GET'],['https://api.example/api/text','OPTIONS']]);
});
test('the frontend has no local runtime, CSRF session, or Vite API proxy; cloud code is retained',()=>{
 const root=new URL('../',import.meta.url),pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
 for(const key of Object.keys(pkg.scripts))assert.doesNotMatch(key,/start:local|stop:local|api:dev|test:local-api|verify:local/);
 assert.equal(existsSync(new URL('server',root)),false);
 assert.doesNotMatch(readFileSync(new URL('vite.config.ts',root),'utf8'),/8787|8788|proxy\s*:/);
 assert.doesNotMatch(readFileSync(new URL('src/api.ts',root),'utf8'),/localApi|localSession|X-CSRF-Token|\/api\/session|localhost/);
 for(const file of ['worker/src.ts','worker/wrangler.toml','worker/migrations/0001_core.sql','shared/ai-prompts.ts','shared/contracts.ts'])assert.ok(existsSync(new URL(file,root)));
 const workflow=readFileSync(new URL('../../.github/workflows/validate-ai-frontend.yml',import.meta.url),'utf8');
 assert.doesNotMatch(workflow,/push:|pages: write|contents: write/);assert.match(workflow,/vars.VITE_API_BASE_URL/);assert.match(workflow,/npm run verify:api/);
});
