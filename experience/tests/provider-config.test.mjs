import {readFileSync} from 'node:fs';import {test} from 'node:test';import assert from 'node:assert/strict';
import {providerConfig} from '../shared/provider-config.ts';import {verifyProviders} from '../cloudbase/verify-providers.mjs';
test('provider configuration requires explicit issuer, preserves custom AIE base and canonical model name',()=>{
 assert.throws(()=>providerConfig({DEEPSEEK_MODEL:'specified'},'DEEPSEEK'));
 assert.deepEqual(providerConfig({DEEPSEEK_BASE_URL:'https://aie.example/custom/v1/',DEEPSEEK_MODEL:'authorized-id'},'DEEPSEEK'),{base:'https://aie.example/custom/v1',model:'authorized-id'});
 assert.throws(()=>providerConfig({ARK_BASE_URL:'https://ark.example/v3',ARK_IMAGE_MODEL_ID:'legacy'},'ARK'),/rename/);
 assert.throws(()=>providerConfig({ARK_BASE_URL:'https://ark.example/v3',ARK_IMAGE_MODEL_ID:'legacy',ARK_IMAGE_MODEL:'different'},'ARK'),/conflict/);
 for(const url of ['http://host','https://host/v1/chat/completions','https://u:p@host','https://host?key=x'])assert.throws(()=>providerConfig({DEEPSEEK_BASE_URL:url,DEEPSEEK_MODEL:'configured'},'DEEPSEEK'));
});
test('live probe skips absent secrets, validates JSON, never logs secrets or content',async()=>{
 let calls=0;const logs=[];const log=(...x)=>logs.push(x.join(' '));await verifyProviders({},()=>{calls++;throw Error('must not call')},log);assert.equal(calls,0);
 const env={DEEPSEEK_BASE_URL:'https://aie.example/v1',DEEPSEEK_MODEL:'configured-id',DEEPSEEK_API_KEY:'fixture-only-key'};
 const failed=await verifyProviders(env,async url=>{calls++;return Response.json(url.endsWith('/models')?{data:[{id:'configured-id'}]}:{choices:[{message:{content:'not JSON'}}]})},log);assert.equal(failed[0].success,false);
 const passed=await verifyProviders(env,async url=>Response.json(url.endsWith('/models')?{data:[]}:{choices:[{message:{content:'{"ok":true}'}}]}),log);assert.equal(passed[0].success,true);assert.ok(!logs.join('').includes(env.DEEPSEEK_API_KEY));
});

test("deployment retains dashboard provider settings instead of overwriting verified URLs or IDs",()=>{const config=readFileSync(new URL("../legacy/cloudflare/worker/wrangler.toml",import.meta.url),"utf8");assert.match(config,/^keep_vars = true$/m);assert.doesNotMatch(config,/^(DEEPSEEK_BASE_URL|DEEPSEEK_MODEL|ARK_BASE_URL|ARK_IMAGE_MODEL)\s*=/m)});
