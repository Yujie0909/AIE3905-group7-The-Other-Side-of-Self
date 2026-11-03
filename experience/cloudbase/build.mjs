import {build} from 'esbuild';
import {mkdir,copyFile,writeFile,chmod,cp,readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),out=join(root,'artifacts/cloudbase/function');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await build({entryPoints:[join(root,'cloudbase/entry.mjs')],outfile:join(out,'index.cjs'),bundle:true,platform:'node',target:'node18',format:'cjs',external:['tencentcloud-sdk-nodejs-captcha'],logLevel:'warning'});
const pkg=JSON.parse(await readFile(join(root,'cloudbase/package.json'),'utf8'));await writeFile(join(out,'package.json'),JSON.stringify({...pkg,type:'commonjs',main:'index.cjs'},null,2)+'\n');
await copyFile(join(root,'cloudbase/package-lock.json'),join(out,'package-lock.json'));
await mkdir(join(out,'migrations'),{recursive:true});await copyFile(join(root,'cloudbase/migrations/0001_core.sql'),join(out,'migrations/0001_core.sql'));
await copyFile(join(root,'cloudbase/scf_bootstrap'),join(out,'scf_bootstrap'));await chmod(join(out,'scf_bootstrap'),0o755);
if(process.argv.includes('--package')){
 await cp(join(root,'cloudbase/node_modules'),join(out,'node_modules'),{recursive:true});
 const zip=resolve(out,'../flow-space-api-rpc.zip');await rm(zip,{force:true});const result=spawnSync('zip',['-qr',zip,'.'],{cwd:out,stdio:'inherit'});if(result.status!==0)throw Error('zip_failed');console.log(zip);
}else console.log('CloudBase Node >=18 package prepared; no network calls or deployment performed.');
