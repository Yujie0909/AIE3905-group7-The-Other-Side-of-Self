import {createServer} from 'node:http';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {object,string,strings,cleanWords,validateResult,ValidationError} from '../shared/contracts.ts';
import {prompts} from '../shared/ai-prompts.ts';
import {providerIssues,hasProviderConfig,ProviderConfigError} from '../shared/provider-config.ts';
import {providers} from './providers.mjs';
import {cloudBaseRpcStore,databaseConfiguration} from './rdb-http.mjs';
import {verifyCaptcha} from './captcha.mjs';
import {Failure,fail} from './errors.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
const uuid=v=>{const s=string(v,64);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(s))fail(400,'invalid_request_id');return s};
function input(task,v){const b=object(v),ideal=string(b.ideal??'',2000);if(task==='ideal'){if(!ideal)fail(400,'ideal_required');return {ideal,adjustment:string(b.adjustment??'',1000),confirmed:b.confirmed===true,previousPlan:b.previousPlan?validateResult('ideal',b.previousPlan):null}}return {ideal,daily:string(b.daily??'',4500),reflection:string(b.reflection??'',2000)}}
async function readBody(req){if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'json_required');let n=0;const chunks=[];for await(const chunk of req){n+=chunk.length;if(n>16000)fail(413,'request_too_large');chunks.push(chunk)}try{return object(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{fail(400,'invalid_json')}}
export function createApi(env=process.env,{store,transport=fetch,captcha=verifyCaptcha}={}){
 const ai=providers(env,transport),active=new Set();let database=store?Promise.resolve(store):undefined,closing=false,shutdown;
 const db=async()=>{if(!database)database=Promise.resolve().then(()=>cloudBaseRpcStore(env)).catch(e=>{database=undefined;throw e});return database};
 const allowed=(env.ALLOWED_ORIGINS||'https://yujie0909.github.io').split(',').map(x=>x.trim()).filter(Boolean);
 const prefix=(env.API_PATH_PREFIX===undefined?'/flow-space-api':env.API_PATH_PREFIX).replace(/\/$/,'');if(prefix&&!/^\/[a-zA-Z0-9_/-]+$/.test(prefix))throw Error('invalid_gateway_prefix');
 const sign=v=>{if(!env.ABUSE_SALT||env.ABUSE_SALT.length<32)fail(503,'backend_not_configured');return createHmac('sha256',env.ABUSE_SALT).update(v).digest('hex')};
 function issue(){const payload=Buffer.from(JSON.stringify({id:randomUUID(),expires:Date.now()+300000})).toString('base64url');return {token:payload+'.'+sign('visitor:'+payload),expires:Date.now()+295000}}
 function visitor(req){if(typeof req.headers['x-flow-token']!=='string')fail(403,'verification_required');const token=string(req.headers['x-flow-token'],2048),[payload,sig,...rest]=token.split('.');if(!payload||!sig||rest.length||!equal(sign('visitor:'+payload),sig))fail(403,'verification_required');let value;try{value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{fail(403,'verification_required')}if(!value.id||!Number.isSafeInteger(value.expires)||value.expires<Date.now()||value.expires>Date.now()+310000)fail(403,'verification_required');return digest(value.id)}
 async function quota(store,id,action){const now=Date.now(),buckets=[[`minute:${id}:${Math.floor(now/60000)}`,20,now+120000]];if(action==='text')buckets.push([`text:${id}:${Math.floor(now/86400000)}`,30,now+86400000],[`text-global:${Math.floor(now/86400000)}`,Math.min(100,Number(env.TEXT_DAILY_QUOTA)||100),now+86400000]);await store.quota(buckets)}
 const server=createServer(async(req,res)=>{
  const controller=new AbortController();active.add(controller);req.on('aborted',()=>controller.abort());res.on('close',()=>{if(!res.writableEnded)controller.abort()});
  const origin=req.headers.origin,cors=allowed.includes(origin)?origin:null;
  const send=(value,status=200)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cors?{'Access-Control-Allow-Origin':cors,Vary:'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Flow-Token','Access-Control-Max-Age':'600'}:{})});res.end(status===204?undefined:JSON.stringify(value))};
  try{
   if(origin&&!cors)fail(403,'origin_not_allowed');
   const raw=new URL(req.url,'https://function.invalid').pathname;
   const path=prefix?(raw.startsWith(prefix+'/')?raw.slice(prefix.length):raw):raw;
   if(req.method==='OPTIONS'){if(!cors)fail(403,'origin_required');return send(null,204)}
   if(req.method==='GET'&&path==='/api/health')return send({ok:true,service:'flow-space-api',platform:'cloudbase',configurationIssues:providerIssues(env),textConfigured:Boolean(env.DEEPSEEK_API_KEY&&hasProviderConfig(env,'DEEPSEEK')),imageConfigured:Boolean(env.ARK_API_KEY&&hasProviderConfig(env,'ARK')),databaseType:env.CLOUDBASE_DB_TYPE||null,databaseConfigured:databaseConfiguration(env),databaseAccess:'cloudbase-http-rpc-v2',databaseVerified:null,verificationConfigured:Boolean(env.TENCENT_CAPTCHA_APP_ID&&env.TENCENT_CAPTCHA_APP_SECRET_KEY&&env.ABUSE_SALT?.length>=32&&env.CLIENT_IP_HEADER&&env.TENCENTCLOUD_SECRETID&&env.TENCENTCLOUD_SECRETKEY),gatewayPrefix:prefix});
   if(req.method==='GET'&&path==='/api/wordcloud'){
    const repository=await db();await repository.quota([[`public-read:${Math.floor(Date.now()/60000)}`,120,Date.now()+120000]]);return send({words:await repository.cloud()});
   }
   if(req.method!=='POST'||!['/api/verify','/api/text','/api/image','/api/wordcloud/preview','/api/wordcloud/share'].includes(path))fail(404,'not_found');
   if(!cors)fail(403,'origin_required');
   const b=await readBody(req),repository=await db(),signal=controller.signal;
   if(path==='/api/verify'){
    // CloudBase's gateway must overwrite this configured header. It is used for captcha validation,
    // not as the sole budget/authentication identity; global DB quotas remain authoritative.
    const header=env.CLIENT_IP_HEADER;if(!header)fail(503,'gateway_identity_not_configured');
    const ip=String(req.headers[header.toLowerCase()]||'').split(',').at(-1).trim();if(!isIP(ip))fail(503,'gateway_identity_unavailable');
    await repository.quota([[`verify-global:${Math.floor(Date.now()/60000)}`,30,Date.now()+120000],[`verify-day:${Math.floor(Date.now()/86400000)}`,Math.min(1000,Number(env.VERIFY_DAILY_QUOTA)||200),Date.now()+86400000]]);
    const ticket=string(b.ticket,4096),randstr=string(b.randstr,256);if(!ticket||!randstr)fail(403,'verification_required');
    await captcha(env,ticket,randstr,ip);await repository.consumeTicket(ticket,Date.now()+600000);return send(issue());
   }
   const identity=visitor(req);await quota(repository,identity,'read');
   if(path==='/api/text'){
    const task=string(b.task,30);if(!Object.hasOwn(prompts,task))fail(400,'invalid_task');const value=input(task,b.input);await quota(repository,identity,'text');return send({result:await ai.text(task,value,signal)});
   }
   if(path==='/api/image'){
    const id=uuid(b.requestId),prompt=string(b.prompt,5000);if(!prompt)fail(400,'prompt_required');if(/1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(prompt))fail(400,'private_information_in_prompt');if(!env.ARK_API_KEY||!hasProviderConfig(env,'ARK'))fail(503,'image_not_configured');
    const previous=await repository.imageStart(id,digest(prompt),Math.min(20,Number(env.IMAGE_DAILY_QUOTA)||20));if(previous)return send({url:previous,temporary:true});
    try{const url=await ai.image(prompt,signal);if(!closing)await repository.imageFinish(id,url);return send({url,temporary:true})}catch(e){if(!closing)await repository.imageFinish(id,null);throw e}
   }
   if(path==='/api/wordcloud/preview'){
    const words=cleanWords(b.words);await quota(repository,identity,'text');const result=await ai.approve(words,signal),approved=strings(result.approved,3,16);if(!approved.length||approved.some(w=>!words.includes(w)))fail(422,'words_not_public_safe');const expires=Date.now()+600000;
    return send({words:approved,expires,approval:sign(`${expires}:${JSON.stringify(approved)}`)});
   }
   if(b.consent!==true)fail(400,'explicit_consent_required');const words=cleanWords(b.words),id=uuid(b.requestId),hash=digest(JSON.stringify(words));
   if(await repository.shared(id,hash))return send({saved:true,replayed:true});const expires=Number(b.expires),approval=string(b.approval,128),expected=sign(`${expires}:${JSON.stringify(words)}`);
   if(!Number.isSafeInteger(expires)||expires<Date.now()||expires>Date.now()+610000||!equal(approval,expected))fail(400,'preview_required');return send({saved:true,replayed:await repository.share(id,hash,words,identity)});
  }catch(e){send({error:e instanceof Failure?e.code:e instanceof ProviderConfigError?e.message:e instanceof ValidationError?'invalid_input':'backend_unavailable'},e instanceof Failure?e.status:e instanceof ProviderConfigError?503:e instanceof ValidationError?400:503)}finally{active.delete(controller)}
 });
 server.maxConnections=64;server.headersTimeout=10000;server.requestTimeout=15000;server.keepAliveTimeout=5000;
 server.stopCloud=()=>shutdown??=new Promise(resolve=>{closing=true;for(const c of active)c.abort();server.close(async()=>{if(database)await(await database.catch(()=>null))?.close().catch(()=>{});resolve()});server.closeAllConnections()});
 return server;
}
