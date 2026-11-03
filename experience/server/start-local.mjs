import {readFileSync,writeFileSync,chmodSync} from 'node:fs';
import {createServer} from 'node:http';
import {parseEnv} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {createLocalApi} from './index.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const keys=['DEEPSEEK_API_KEY','DEEPSEEK_BASE_URL','DEEPSEEK_MODEL','ARK_API_KEY','ARK_BASE_URL','ARK_IMAGE_MODEL','ARK_IMAGE_SIZE','ARK_IMAGE_HOSTS','TEXT_DAILY_QUOTA','IMAGE_DAILY_QUOTA'];
export function localSettings(){
 const file=join(root,'server/.env');let values;
 try{values=parseEnv(readFileSync(file,'utf8'))}catch(e){
  if(e.code!=='ENOENT')throw Error('Cannot read server/.env');
  const template=readFileSync(join(root,'.env.server.example'),'utf8');writeFileSync(file,template,{flag:'wx',mode:0o600});values=parseEnv(template);
  console.log('Created server/.env. Fill in your server API keys and authorized model IDs there; never send them in chat.');
 }
 chmodSync(file,0o600);
 // Keep secrets out of process.env and the Vite environment. Ignore any VITE_ keys in this file.
 const env=Object.fromEntries(keys.map(key=>[key,values[key]||process.env[key]||'']));
 return {...env,API_MODE:'local',LOCAL_DB_PATH:join(root,'server/data/flow.sqlite')};
}
export async function startLocal({env,transport}={}){
 let api,vite,frontend,stopping;
 async function stop(){
  if(!stopping)stopping=Promise.allSettled([api?.stopLocal(),vite?.close(),frontend?.listening?new Promise(resolve=>{frontend.close(resolve);frontend.closeAllConnections()}):undefined]).then(()=>{});
  return stopping;
 }
 const onSignal=()=>{void stop().then(()=>console.log('Local servers stopped; ports and database released.'))};
 try{
  api=createLocalApi(env??localSettings(),{transport});
  await new Promise((resolve,reject)=>{api.once('error',reject);api.listen(8788,'127.0.0.1',resolve)});
  // Loaded only by this command. No extra daemon, child backend, or cloud CLI is started.
  const {createServer:createVite}=await import('vite');
  // Middleware mode lets this launcher own all shutdown logic; Vite must not exit
  // the process before an in-flight upstream request and SQLite are cleaned up.
  frontend=createServer((req,res)=>{
   if(!['127.0.0.1:5173','localhost:5173'].includes(req.headers.host)){res.writeHead(403).end();return}
   vite.middlewares(req,res);
  });
  vite=await createVite({root,define:{'import.meta.env.VITE_LOCAL_ONLY':JSON.stringify('true')},server:{middlewareMode:true,host:'127.0.0.1',port:5173,strictPort:true,hmr:{server:frontend,host:'127.0.0.1'}}});
  await new Promise((resolve,reject)=>{frontend.once('error',reject);frontend.listen(5173,'127.0.0.1',resolve)});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,onSignal);
  console.log('心流空间: http://127.0.0.1:5173');
  console.log('API: http://127.0.0.1:8788/api/health (127.0.0.1 only). Ctrl+C stops both servers.');
  return {api,vite,frontend,async stop(){for(const signal of ['SIGINT','SIGTERM'])process.removeListener(signal,onSignal);await stop()}};
 }catch(e){await stop();throw e}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 startLocal().catch(e=>{console.error(e.code==='EADDRINUSE'?'Port 5173 or 8788 is already occupied; stop that instance first.':'Local startup failed. Check Node >=22.18, server/.env, and available ports.');process.exitCode=1});
}
