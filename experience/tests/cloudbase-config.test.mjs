import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {checkApi} from '../cloudbase/check-api.mjs';
test('CloudBase preflight rejects placeholders and tests the exact gateway prefix without paid calls',async()=>{
 const env={VITE_API_BASE_URL:'https://api.example/flow-space-api',VITE_TENCENT_CAPTCHA_APP_ID:'2081234567'};let calls=0;
 await assert.rejects(checkApi(env,async()=>{calls++;return new Response('Hello World!')}),/not JSON/);assert.equal(calls,1);
 const urls=[],headers={'Access-Control-Allow-Origin':'https://yujie0909.github.io','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Flow-Token'};
 const r=await checkApi(env,async(url,options)=>{urls.push(url);return url.endsWith('/api/wordcloud')?Response.json({words:[]},{headers}):options.method==='OPTIONS'?new Response(null,{status:204,headers}):Response.json({ok:true,platform:'cloudbase',databaseAccess:'cloudbase-http-rpc-v2',databaseType:'postgresql',databaseConfigured:true,textConfigured:true,imageConfigured:true,verificationConfigured:true,configurationIssues:[]},{headers})});assert.ok(r.ready);assert.deepEqual(urls,['https://api.example/flow-space-api/api/health','https://api.example/flow-space-api/api/text','https://api.example/flow-space-api/api/wordcloud']);
});
test('only CloudBase is active; local server absent; Cloudflare is isolated pending verified cutover',()=>{
 const root=new URL('../',import.meta.url),pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
 for(const key of Object.keys(pkg.scripts))assert.doesNotMatch(key,/^worker:|start:local|stop:local|api:dev/);
 assert.equal(existsSync(new URL('server',root)),false);assert.equal(existsSync(new URL('worker',root)),false);
 assert.doesNotMatch(readFileSync(new URL('src/api.ts',root),'utf8'),/Turnstile|turnstile|workers\.dev|localhost|api\/session/);
 const config=JSON.parse(readFileSync(new URL('cloudbase/cloudbaserc.json',root),'utf8'));assert.equal(config.envId,'flow-space-d9gzw4xiiba0881b3');assert.equal(config.functions.length,1);assert.equal(config.functions[0].name,'flow-space-api');assert.equal(config.functions[0].type,'HTTP');
 assert.match(readFileSync(new URL('cloudbase/entry.mjs',root),'utf8'),/listen\(9000,'0.0.0.0'/);assert.match(readFileSync(new URL('cloudbase/scf_bootstrap',root),'utf8'),/exec node index.cjs/);
 assert.equal(JSON.parse(readFileSync(new URL('legacy/cloudflare/retired.json',root),'utf8')).doNotDeploy,true);
});
