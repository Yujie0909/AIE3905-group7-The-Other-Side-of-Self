import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {publicBuildConfig} from '../cloudbase/public-build-config.mjs';
import {auditFrontendBuild} from '../cloudbase/audit-frontend-build.mjs';
const env={VITE_API_BASE_URL:'https://gateway.example/flow-space-api',VITE_TENCENT_CAPTCHA_APP_ID:'2081234567'};
test('production requires exact gateway base and public numeric captcha ID, without echoing misplaced secrets',()=>{
 for(const url of ['http://gateway.example/flow-space-api','https://gateway.example','https://gateway.example/flow-space-api/api/health','https://user:pass@gateway.example/flow-space-api'])assert.throws(()=>publicBuildConfig({...env,VITE_API_BASE_URL:url}));
 assert.throws(()=>publicBuildConfig({...env,VITE_TENCENT_CAPTCHA_APP_ID:'misplaced-private-value'}),e=>!e.message.includes('misplaced-private-value'));
 assert.equal(publicBuildConfig(env).appId,'2081234567');
});
test('artifact audit fails when variables exist only in configuration, and rejects retired backends',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'flow-build-audit-'));await mkdir(join(dir,'assets'));
 try{
  const file=join(dir,'assets','index.js');await writeFile(file,'console.log("no configured backend")');await assert.rejects(auditFrontendBuild(env,dir),/does not contain/);
  const code=JSON.stringify(env.VITE_API_BASE_URL)+';'+JSON.stringify(env.VITE_TENCENT_CAPTCHA_APP_ID);await writeFile(file,code);assert.equal((await auditFrontendBuild(env,dir)).publicConfigurationEmbedded,true);
  await writeFile(file,code+';"https://old.workers.dev"');await assert.rejects(auditFrontendBuild(env,dir),/retired/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
