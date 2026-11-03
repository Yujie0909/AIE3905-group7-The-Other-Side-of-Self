// Backend-only live probe. No keys, headers, content or signed image URLs in logs.
import {providerConfig} from '../shared/provider-config.ts';
export async function verifyProviders(env=process.env,transport=fetch,log=console.log){
 const results=[];
 for(const provider of ['DEEPSEEK','ARK']){
  const key=env[provider==='ARK'?'ARK_API_KEY':'DEEPSEEK_API_KEY'];let config;
  try{config=providerConfig(env,provider,false)}catch(e){log(provider,'NOT VERIFIED:',e.message);results.push({provider,success:false});continue}
  if(!key){log(provider,'NOT VERIFIED: server secret missing');results.push({provider,success:false});continue}
  const headers={Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  try{const r=await transport(config.base+'/models',{headers,signal:AbortSignal.timeout(10000),redirect:'error'});const j=r.ok?await r.json():{};log(provider,'models status',r.status,'configured ID listed:',Array.isArray(j.data)?j.data.some(x=>x.id===config.model):'unavailable')}catch{log(provider,'models probe unavailable; not proof of model support')}
  if(!config.model){log(provider,'NOT VERIFIED: exact authorized model ID missing');results.push({provider,success:false});continue}
  if(provider==='ARK'&&env.VERIFY_IMAGE_GENERATION!=='1'){log(provider,'NOT VERIFIED: set VERIFY_IMAGE_GENERATION=1 for one paid image');results.push({provider,success:false});continue}
  const start=Date.now(),body=provider==='ARK'?{model:config.model,prompt:'A single blue ceramic cup on a table, no text',size:env.ARK_IMAGE_SIZE||'2048x1152',n:1,response_format:'url',watermark:true}:{model:config.model,messages:[{role:'user',content:'Return JSON only: {"ok":true}'}],response_format:{type:'json_object'},max_tokens:64,stream:false};
  let success=false;
  try{const r=await transport(config.base+(provider==='ARK'?'/images/generations':'/chat/completions'),{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(provider==='ARK'?110000:25000),redirect:'error'});const j=r.ok?await r.json():{};
   if(provider==='ARK'){const u=new URL(j.data?.[0]?.url);success=r.ok&&u.protocol==='https:'}else success=r.ok&&JSON.parse(j.choices?.[0]?.message?.content)?.ok===true;
   log(provider,'actual call status',r.status,'valid response',success,'elapsed ms',Date.now()-start);
  }catch{log(provider,'actual call failed or invalid response; elapsed ms',Date.now()-start)}
  results.push({provider,success});
 }
 return results;
}
if(import.meta.url===new URL(process.argv[1], 'file://').href){const results=await verifyProviders();if(results.some(r=>!r.success))process.exitCode=2}
