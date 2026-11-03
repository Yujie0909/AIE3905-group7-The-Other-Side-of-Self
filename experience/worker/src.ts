import {rules,prompts} from '../shared/ai-prompts.ts';
import {ValidationError,object,string,strings,cleanWords,validateResult,type Task} from '../shared/contracts.ts';
import {providerConfig,providerIssues,hasProviderConfig,ProviderConfigError} from './provider-config.ts';
interface Statement{bind(...values:unknown[]):Statement;first<T=Record<string,unknown>>():Promise<T|null>;all<T=Record<string,unknown>>():Promise<{results:T[]}>}
export interface DB{prepare(sql:string):Statement;batch(statements:Statement[]):Promise<unknown[]>}
export interface Env{DB?:DB;ALLOWED_ORIGINS:string;DEEPSEEK_BASE_URL:string;DEEPSEEK_MODEL:string;ARK_BASE_URL:string;ARK_IMAGE_MODEL:string;ARK_IMAGE_MODEL_ID?:string;ARK_IMAGE_SIZE?:string;ARK_IMAGE_HOSTS?:string;DEEPSEEK_API_KEY?:string;ARK_API_KEY?:string;TURNSTILE_SECRET_KEY?:string;TURNSTILE_HOSTNAMES:string;ABUSE_SALT?:string;TEXT_DAILY_QUOTA?:string;IMAGE_DAILY_QUOTA?:string}
class Failure extends Error{status:number;code:string;constructor(status:number,code:string){super(code);this.status=status;this.code=code}}
function fail(status:number,code:string):never{throw new Failure(status,code)}
const uuid=(v:unknown)=>{const id=string(v,64);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id))fail(400,'invalid_request_id');return id};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const digest=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
async function sign(secret:string,text:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('')}
async function readBody(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json'))fail(415,'json_required');
 const reader=req.body?.getReader();if(!reader)fail(400,'body_required');let bytes=0,chunks='';const decoder=new TextDecoder();
 for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16000){await reader.cancel();fail(413,'request_too_large')}chunks+=decoder.decode(value,{stream:true})}chunks+=decoder.decode();try{return object(JSON.parse(chunks))}catch{fail(400,'invalid_json')}
}
async function upstream(url:string,key:string,payload:unknown,timeout=25000){
 let response:Response;try{response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout),redirect:'error'})}catch{fail(504,'upstream_timeout')}
 if(!response.ok){await response.body?.cancel();fail(response.status===429?429:502,'provider_unavailable')}
 try{return object(await response.json())}catch{fail(502,'invalid_provider_response')}
}
function endpoint(base:string,path:string){let u:URL;try{u=new URL(base)}catch{fail(503,'provider_not_configured')}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)fail(503,'provider_not_configured');return base.replace(/\/$/,'')+path}
async function text(env:Env,system:string,input:unknown){
 if(!env.DEEPSEEK_API_KEY||!env.DEEPSEEK_MODEL)fail(503,'text_not_configured');
 const config=providerConfig(env,'DEEPSEEK');
 const r=await upstream(endpoint(config.base,'/chat/completions'),env.DEEPSEEK_API_KEY,{model:config.model,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'},stream:false,max_tokens:2200});
 try{const choices=r.choices as {message:{content:string}}[];return object(JSON.parse(choices[0].message.content))}catch{fail(502,'invalid_model_json')}
}
async function count(env:Env,bucket:string,max:number,expires:number){const row=await env.DB!.prepare('INSERT INTO limits(bucket,n,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET n=n+1 WHERE n<? RETURNING n').bind(bucket,expires,max).first();if(!row)fail(429,'quota_exceeded')}
async function protect(req:Request,env:Env,action:string){
 if(!env.DB||!env.ABUSE_SALT||env.ABUSE_SALT.length<32)fail(503,'backend_not_configured');
 const now=Math.floor(Date.now()/1000),ip=req.headers.get('CF-Connecting-IP');if(!ip)fail(503,'client_identity_unavailable');
 const identity=await sign(env.ABUSE_SALT,ip);await count(env,`minute:${identity}:${Math.floor(now/60)}`,20,now+120);
 if(action==='read'){await env.DB!.prepare('DELETE FROM limits WHERE expires<?').bind(now).all();return;}
 if(action!=='share')await count(env,`day:${action}:${identity}:${Math.floor(now/86400)}`,action==='image'?5:30,now+86400);
 await env.DB.batch([env.DB.prepare('DELETE FROM limits WHERE expires<?').bind(now),env.DB.prepare('DELETE FROM image_jobs WHERE expires<?').bind(now)]);return identity;
}
async function human(req:Request,env:Env){
 if(!env.TURNSTILE_SECRET_KEY)fail(503,'verification_not_configured');
 const token=req.headers.get('X-Turnstile-Token');if(!token||token.length>4096)fail(403,'verification_required');
 let r:Record<string,unknown>;try{const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:req.headers.get('CF-Connecting-IP')!}),signal:AbortSignal.timeout(8000)});r=object(await res.json())}catch{fail(503,'verification_unavailable')}
 if(!r.success||r.action!=='flow_submit'||!env.TURNSTILE_HOSTNAMES.split(',').includes(String(r.hostname)))fail(403,'verification_failed');
}
function inputs(task:Task,v:unknown){const b=object(v);const ideal=string(b.ideal??'',2000);if(task==='ideal'){if(!ideal)fail(400,'ideal_required');return {ideal,adjustment:string(b.adjustment??'',1000),confirmed:Boolean(b.confirmed),previousPlan:b.previousPlan?validateResult('ideal',b.previousPlan):null}}
 return {ideal,daily:string(b.daily??'',4500),reflection:string(b.reflection??'',2000)};
}
export default {async fetch(req:Request,env:Env):Promise<Response>{
 const origin=req.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()),cors=origin&&allowed.includes(origin)?origin:null;
 const respond=(r:Response)=>{if(cors){r.headers.set('Access-Control-Allow-Origin',cors);r.headers.set('Vary','Origin');r.headers.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');r.headers.set('Access-Control-Allow-Headers','Content-Type,X-Turnstile-Token');r.headers.set('Access-Control-Max-Age','600')}return r};
 try{
  if(origin&&!cors)fail(403,'origin_not_allowed');
  if(req.method==='OPTIONS')return respond(new Response(null,{status:204}));
  const path=new URL(req.url).pathname;
  if(req.method==='GET'&&path==='/api/health')return respond(json({ok:true,configurationIssues:providerIssues(env),textConfigured:Boolean(env.DEEPSEEK_API_KEY&&hasProviderConfig(env,'DEEPSEEK')),imageConfigured:Boolean(env.ARK_API_KEY&&hasProviderConfig(env,'ARK')),databaseConfigured:Boolean(env.DB),verificationConfigured:Boolean(env.TURNSTILE_SECRET_KEY&&env.ABUSE_SALT)}));
  if(req.method==='GET'&&path==='/api/wordcloud'){
   await protect(req,env,'read');
   const {results}=await env.DB!.prepare('SELECT normalized_word AS word,COUNT(*) AS frequency,MAX(created_at) AS last_seen FROM wordcloud_entries GROUP BY normalized_word ORDER BY frequency DESC,word LIMIT 12').all<{word:string;frequency:number}>();
   const rare=await env.DB!.prepare('SELECT normalized_word AS word,COUNT(*) AS frequency,MAX(created_at) AS last_seen FROM wordcloud_entries GROUP BY normalized_word ORDER BY frequency ASC,last_seen DESC LIMIT 18').all<{word:string;frequency:number}>();
   return respond(json({words:[...results,...rare.results.filter(r=>!results.some(w=>w.word===r.word))].slice(0,18).map(({word,frequency})=>({word,frequency}))}));
  }
  if(req.method!=='POST'||!['/api/text','/api/image','/api/wordcloud/preview','/api/wordcloud/share'].includes(path))fail(404,'not_found');
  if(!cors)fail(403,'origin_required');
  const b=await readBody(req);
  const action=path==='/api/image'?'image':path==='/api/wordcloud/share'?'share':'text';const identity=await protect(req,env,action);
  if(path==='/api/wordcloud/share'){
   if(b.consent!==true)fail(400,'explicit_consent_required');const words=cleanWords(b.words),id=uuid(b.requestId),hash=await digest(JSON.stringify(words));
   const previous=await env.DB!.prepare('SELECT body_hash FROM submissions WHERE id=?').bind(id).first<{body_hash:string}>();
   if(previous){if(previous.body_hash!==hash)fail(409,'idempotency_conflict');return respond(json({saved:true,replayed:true}))}
   const expires=Number(b.expires),signature=string(b.approval,128),expected=await sign(env.ABUSE_SALT!,`${expires}:${JSON.stringify(words)}`);
   if(!Number.isSafeInteger(expires)||expires<Date.now()||expires>Date.now()+610000||signature.length!==expected.length)fail(400,'preview_required');
   let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^signature.charCodeAt(i);if(mismatch)fail(400,'preview_required');
   await human(req,env);
   await count(env,`day:share:${identity}:${Math.floor(Date.now()/86400000)}`,5,Math.floor(Date.now()/1000)+86400);
   const now=Date.now();await env.DB!.batch([env.DB!.prepare('INSERT INTO submissions(id,body_hash,created_at) VALUES(?,?,?) ON CONFLICT(id) DO NOTHING').bind(id,hash,now),...words.map(w=>env.DB!.prepare('INSERT INTO wordcloud_entries(id,submission_id,normalized_word,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM submissions WHERE id=? AND body_hash=?) ON CONFLICT(submission_id,normalized_word) DO NOTHING').bind(crypto.randomUUID(),id,w,now,id,hash))]);
   const saved=await env.DB!.prepare('SELECT body_hash FROM submissions WHERE id=?').bind(id).first<{body_hash:string}>();if(saved?.body_hash!==hash)fail(409,'idempotency_conflict');return respond(json({saved:true}));
  }
  await human(req,env);
  if(path==='/api/wordcloud/preview'){
   const words=cleanWords(b.words);await count(env,`text-global:${Math.floor(Date.now()/86400000)}`,Number(env.TEXT_DAILY_QUOTA)||100,Math.floor(Date.now()/1000)+86400);
   const result=await text(env,rules+'仅审核这些待公开词语。只返回approved数组(仅原样批准的安全词)，拒绝姓名、联系方式、地址、账号、隐私、辱骂仇恨色情暴力，拿不准就拒绝，不得修改或新增词语。',{words});
   const approved=strings(result.approved,3,16);if(!approved.length||approved.some(w=>!words.includes(w)))fail(422,'words_not_public_safe');
   const expires=Date.now()+600000;return respond(json({words:approved,expires,approval:await sign(env.ABUSE_SALT!,`${expires}:${JSON.stringify(approved)}`)}));
  }
  if(path==='/api/text'){
   const task=string(b.task,30) as Task;if(!Object.hasOwn(prompts,task))fail(400,'invalid_task');const input=inputs(task,b.input);
   await count(env,`text-global:${Math.floor(Date.now()/86400000)}`,Number(env.TEXT_DAILY_QUOTA)||100,Math.floor(Date.now()/1000)+86400);
   let result;try{result=validateResult(task,await text(env,rules+prompts[task],input))}catch(e){if(e instanceof Failure)throw e;fail(502,'invalid_model_schema')}return respond(json({result}));
  }
  if(!env.ARK_API_KEY)fail(503,'image_not_configured');const imageConfig=providerConfig(env,'ARK');
  const id=uuid(b.requestId),prompt=string(b.prompt,5000);if(!prompt)fail(400,'prompt_required');if(/1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(prompt))fail(400,'private_information_in_prompt');const hash=await digest(prompt);
  const previous=await env.DB!.prepare('SELECT body_hash,status,image_url FROM image_jobs WHERE id=?').bind(id).first<{body_hash:string;status:string;image_url:string}>();
  if(previous){if(previous.body_hash!==hash)fail(409,'idempotency_conflict');if(previous.status==='complete')return respond(json({url:previous.image_url,temporary:true}));fail(409,'image_request_already_started')}
  await count(env,`image-global:${Math.floor(Date.now()/86400000)}`,Number(env.IMAGE_DAILY_QUOTA)||20,Math.floor(Date.now()/1000)+86400);
  const inserted=await env.DB!.prepare("INSERT INTO image_jobs(id,body_hash,status,expires) VALUES(?,?,'pending',?) ON CONFLICT(id) DO NOTHING RETURNING id").bind(id,hash,Math.floor(Date.now()/1000)+3600).first();if(!inserted)fail(409,'image_request_already_started');
  try{
   const r=await upstream(endpoint(imageConfig.base,'/images/generations'),env.ARK_API_KEY,{model:imageConfig.model,prompt,size:env.ARK_IMAGE_SIZE||'2048x1152',n:1,response_format:'url',watermark:true},110000);
   const url=string(object((r.data as unknown[])[0]).url,4096),u=new URL(url),hosts=(env.ARK_IMAGE_HOSTS||'.volces.com,.byteimg.com').split(',');if(u.protocol!=='https:'||!hosts.some(h=>h.startsWith('.')?u.hostname.endsWith(h):u.hostname===h))fail(502,'invalid_image_host');
   await env.DB!.prepare("UPDATE image_jobs SET status='complete',image_url=? WHERE id=?").bind(url,id).all();return respond(json({url,temporary:true}));
  }catch(e){await env.DB!.prepare("UPDATE image_jobs SET status='failed' WHERE id=?").bind(id).all();throw e}
 }catch(e){return respond(json({error:e instanceof Failure?e.code:e instanceof ProviderConfigError?e.message:e instanceof ValidationError?'invalid_input':'backend_unavailable'},e instanceof Failure?e.status:e instanceof ProviderConfigError?503:e instanceof ValidationError?400:503))}
}};
