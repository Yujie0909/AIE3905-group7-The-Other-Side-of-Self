import {createHash} from 'node:crypto';
import {fail} from './errors.mjs';
// Official CloudBase PostgREST RPC + server-only API Key:
// https://docs.cloudbase.net/database/postgresql/http/rpc
// https://docs.cloudbase.net/http-api/basic/apikey
export function databaseConfiguration(env){
 const id=(env.CLOUDBASE_ENV_ID||'').trim();
 return env.CLOUDBASE_DB_TYPE==='postgresql'&&/^[a-zA-Z0-9-]+$/.test(id)&&Boolean(env.CLOUDBASE_SERVER_API_KEY?.trim());
}
export function cloudBaseRpcStore(env,{transport=fetch}={}){
 if(!databaseConfiguration(env))fail(503,'database_not_configured');
 const id=env.CLOUDBASE_ENV_ID.trim(),key=env.CLOUDBASE_SERVER_API_KEY.trim();
 const endpoint=`https://${id}.api.tcloudbasegateway.com/v1/rdb/rest/rpc/flow_backend_rpc`;
 const active=new Set();let closed=false;
 const errors={quota_exceeded:429,verification_replayed:403,idempotency_conflict:409,image_request_already_started:409,explicit_consent_required:400,invalid_input:400,invalid_operation:400};
 async function rpc(operation,payload={}){
  if(closed)fail(503,'database_unavailable');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);active.add(controller);
  try{
   let r;try{r=await transport(endpoint,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({p_operation:operation,p_payload:payload}),signal:controller.signal})}catch{fail(503,'database_unavailable')}
   let result;try{result=await r.json()}catch{fail(503,'invalid_database_response')}
   if(!r.ok){
    if(result&&Object.hasOwn(errors,result.message))fail(errors[result.message],result.message);
    if(r.status===401||r.status===403)fail(503,'database_authorization_failed');
    if(['PGRST202','42883','42P01'].includes(result?.code))fail(503,'database_initialization_required');
    fail(503,'database_unavailable');
   }
   if(!result||typeof result!=='object'||Array.isArray(result))fail(503,'invalid_database_response');return result;
  }finally{clearTimeout(timer);active.delete(controller)}
 }
 const checked=async(operation,payload,field,type)=>{const r=await rpc(operation,payload);if(typeof r[field]!==type)fail(503,'invalid_database_response');return r[field]};
 return {
  async close(){closed=true;for(const c of active)c.abort();active.clear()},
  async quota(buckets){if(await checked('quota',{buckets},'ok','boolean')!==true)fail(503,'invalid_database_response')},
  async consumeTicket(ticket,expires){const ticket_hash=createHash('sha256').update(ticket).digest('hex');if(await checked('consume_ticket',{ticket_hash,expires},'ok','boolean')!==true)fail(503,'invalid_database_response')},
  async imageStart(id,hash,max){const r=await rpc('image_start',{id,hash,max});if(r.url!==null&&typeof r.url!=='string')fail(503,'invalid_database_response');return r.url},
  async imageFinish(id,url){if(await checked('image_finish',{id,url},'ok','boolean')!==true)fail(503,'invalid_database_response')},
  shared:(id,hash)=>checked('shared',{id,hash},'shared','boolean'),
  share:(id,hash,words,identity)=>checked('share',{id,hash,words,identity,consent:true},'replayed','boolean'),
  async cloud(){const r=await rpc('cloud');if(!Array.isArray(r.words)||r.words.length>18||r.words.some(w=>typeof w.word!=='string'||!Number.isSafeInteger(w.frequency)||w.frequency<1))fail(503,'invalid_database_response');return r.words},
  ready:()=>checked('ready',{},'ready','boolean')
 };
}
