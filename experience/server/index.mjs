import {createServer} from 'node:http';
import {randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {object,string,strings,cleanWords,validateResult,ValidationError} from '../shared/contracts.ts';
import {prompts} from '../shared/ai-prompts.ts';
import {providerIssues,hasProviderConfig,ProviderConfigError} from '../shared/provider-config.ts';
import {providers} from './providers.mjs';
import {sqliteStore} from './store.mjs';
import {Failure,fail} from './errors.mjs';

const hash=v=>createHash('sha256').update(v).digest('hex');
function uuid(v){const s=string(v,64);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(s))fail(400,'invalid_request_id');return s}
function inputs(task,v){const b=object(v),ideal=string(b.ideal??'',2000);if(task==='ideal'){if(!ideal)fail(400,'ideal_required');return {ideal,adjustment:string(b.adjustment??'',1000),confirmed:b.confirmed===true,previousPlan:b.previousPlan?validateResult('ideal',b.previousPlan):null}}return {ideal,daily:string(b.daily??'',4500),reflection:string(b.reflection??'',2000)}}
async function body(req){
 if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'json_required');
 let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16000)fail(413,'request_too_large');chunks.push(chunk)}
 try{return object(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{fail(400,'invalid_json')}
}
export function createLocalApi(env=process.env,{transport=fetch,store}={}){
 // Local security is loopback + Origin/Host checks + same-site session + CSRF + persisted quotas.
 // Not a public-cloud authentication scheme. Stage 2 needs its own verified identity adapter.
 if(env.API_MODE&&env.API_MODE!=='local')throw Error('local_backend_not_for_public_deployment');
 const origins=new Set(['http://localhost:5173','http://127.0.0.1:5173']);
 const db=store??sqliteStore(resolve(env.LOCAL_DB_PATH||'server/data/flow.sqlite'));
 const ai=providers(env,transport),sessions=new Map(),secret=randomBytes(32);
 const sign=v=>createHmac('sha256',secret).update(v).digest('hex');
 function quota(identity,action){const now=Date.now(),b=[[`minute:${identity}:${Math.floor(now/60000)}`,30,now+120000]];if(action==='text'){b.push([`text:${identity}:${Math.floor(now/86400000)}`,30,now+86400000],[`text-global:${Math.floor(now/86400000)}`,Math.min(100,Number(env.TEXT_DAILY_QUOTA)||100),now+86400000])}if(action==='image')b.push([`image-user:${identity}:${Math.floor(now/86400000)}`,5,now+86400000]);db.quota(b)}
 const server=createServer(async(req,res)=>{
  const controller=new AbortController();req.on('aborted',()=>controller.abort());res.on('close',()=>{if(!res.writableEnded)controller.abort()});
  const send=(data,status=200,headers={})=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))};
  try{
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))fail(403,'local_only');
   const host=req.headers.host;if(!['localhost:5173','127.0.0.1:5173',`127.0.0.1:${server.address()?.port}`,`localhost:${server.address()?.port}`].includes(host))fail(403,'invalid_host');
   const origin=req.headers.origin;if(origin&&!origins.has(origin))fail(403,'origin_not_allowed');
   const path=new URL(req.url,'http://localhost').pathname;
   if(req.method==='GET'&&path==='/api/health')return send({ok:true,mode:'local',configurationIssues:providerIssues(env),textConfigured:Boolean(env.DEEPSEEK_API_KEY&&hasProviderConfig(env,'DEEPSEEK')),imageConfigured:Boolean(env.ARK_API_KEY&&hasProviderConfig(env,'ARK')),databaseConfigured:true});
   const identity=sign(req.socket.remoteAddress);quota(identity,'read');
   if(req.method==='GET'&&path==='/api/wordcloud')return send({words:db.cloud()});
   if(req.method!=='POST'||!origin||!origins.has(origin))fail(403,'origin_required');
   if(path==='/api/session'){
    if(req.headers['x-flow-local']!=='1')fail(403,'verification_required');
    await body(req);for(const [id,s] of sessions)if(s.expires<Date.now())sessions.delete(id);
    if(sessions.size>=256)fail(429,'quota_exceeded');const id=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');sessions.set(id,{csrf,expires:Date.now()+3600000});
    return send({csrf},200,{'Set-Cookie':`flow_local=${id}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600`});
   }
   if(!['/api/text','/api/image','/api/wordcloud/preview','/api/wordcloud/share'].includes(path))fail(404,'not_found');
   const idCookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('flow_local='))?.slice(11);
   const session=sessions.get(idCookie);if(!session||session.expires<Date.now()||req.headers['x-csrf-token']!==session.csrf)fail(403,'verification_required');
   const b=await body(req),signal=controller.signal;
   if(path==='/api/text'){
    const task=string(b.task,30);if(!Object.hasOwn(prompts,task))fail(400,'invalid_task');const input=inputs(task,b.input);quota(identity,'text');return send({result:await ai.text(task,input,signal)});
   }
   if(path==='/api/image'){
    const id=uuid(b.requestId),prompt=string(b.prompt,5000);if(!prompt)fail(400,'prompt_required');if(/1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(prompt))fail(400,'private_information_in_prompt');
    // Validate configuration before consuming an image slot; never call upstream on startup.
    if(!env.ARK_API_KEY||!hasProviderConfig(env,'ARK'))fail(503,'image_not_configured');
    quota(identity,'image');const previous=db.imageStart(id,hash(prompt),Math.min(20,Number(env.IMAGE_DAILY_QUOTA)||20));if(previous)return send({url:previous,temporary:true});
    try{const url=await ai.image(prompt,signal);db.imageFinish(id,url);return send({url,temporary:true})}catch(e){db.imageFinish(id,null);throw e}
   }
   if(path==='/api/wordcloud/preview'){
    const words=cleanWords(b.words);quota(identity,'text');const result=await ai.approve(words,signal),approved=strings(result.approved,3,16);
    if(!approved.length||approved.some(w=>!words.includes(w)))fail(422,'words_not_public_safe');const expires=Date.now()+600000;
    return send({words:approved,expires,approval:sign(`${session.csrf}:${expires}:${JSON.stringify(approved)}`)});
   }
   if(b.consent!==true)fail(400,'explicit_consent_required');const words=cleanWords(b.words),id=uuid(b.requestId),digest=hash(JSON.stringify(words));
   if(db.shared(id,digest))return send({saved:true,replayed:true});
   const expires=Number(b.expires),approval=string(b.approval,128),expected=sign(`${session.csrf}:${expires}:${JSON.stringify(words)}`);
   if(!Number.isSafeInteger(expires)||expires<Date.now()||expires>Date.now()+610000||approval.length!==expected.length||!timingSafeEqual(Buffer.from(approval),Buffer.from(expected)))fail(400,'preview_required');
   return send({saved:true,replayed:db.share(id,digest,words,identity)});
  }catch(e){send({error:e instanceof Failure?e.code:e instanceof ProviderConfigError?e.message:e instanceof ValidationError?'invalid_input':'backend_unavailable'},e instanceof Failure?e.status:e instanceof ProviderConfigError?503:e instanceof ValidationError?400:503)}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
 server.on('close',()=>{sessions.clear();db.close()});
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const port=Number(process.env.API_PORT||8788);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_api_port');
 const server=createLocalApi();server.listen(port,'127.0.0.1',()=>console.log(`Local API listening on http://127.0.0.1:${port} (loopback only)`));
 for(const event of ['SIGINT','SIGTERM'])process.once(event,()=>{server.close();server.closeIdleConnections()});
}
