import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicBuildConfig} from './public-build-config.mjs';
export async function auditFrontendBuild(env=process.env,directory='dist'){
 const {base,appId}=publicBuildConfig(env),assets=join(directory,'assets');
 const files=(await readdir(assets)).filter(file=>file.endsWith('.js'));
 const code=(await Promise.all(files.map(file=>readFile(join(assets,file),'utf8')))).join('\n');
 if(!code.includes(JSON.stringify(base))||!code.includes(JSON.stringify(appId)))throw Error('Production JavaScript does not contain the configured API base and public captcha App ID; rebuild with both variables in the build environment');
 if(code.includes('challenges.cloudflare.com')||code.includes('workers.dev')||code.includes('http://127.0.0.1:8788'))throw Error('Production JavaScript contains a retired backend dependency');
 return {publicConfigurationEmbedded:true,liveApiCallsVerified:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{console.log(await auditFrontendBuild())}catch(e){console.error(e.message);process.exitCode=2}}
