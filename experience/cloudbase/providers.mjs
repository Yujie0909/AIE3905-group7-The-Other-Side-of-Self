import {providerConfig} from '../shared/provider-config.ts';
import {object,string,validateResult} from '../shared/contracts.ts';
import {rules,prompts} from '../shared/ai-prompts.ts';
import {fail} from './errors.mjs';

// No Worker handler, D1 binding, frontend secrets, or startup network work.
export function providers(env,transport=fetch){
 async function post(kind,path,payload,signal,timeout){
  const key=env[kind==='ARK'?'ARK_API_KEY':'DEEPSEEK_API_KEY'];
  if(!key)fail(503,kind==='ARK'?'image_not_configured':'text_not_configured');
  const {base,model}=providerConfig(env,kind);
  const controller=new AbortController(),abort=()=>controller.abort();let r;
  const timer=setTimeout(abort,timeout);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  try{
   try{r=await transport(base+path,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,...payload}),signal:controller.signal})}catch{fail(504,signal.aborted?'request_cancelled':'upstream_timeout')}
   if(!r.ok){await r.body?.cancel();fail(r.status===429?429:502,'provider_unavailable')}
   try{return object(await r.json())}catch{fail(502,'invalid_provider_response')}
  }finally{clearTimeout(timer);signal.removeEventListener('abort',abort)}
 }
 async function json(system,input,signal){
  const r=await post('DEEPSEEK','/chat/completions',{messages:[{role:'system',content:rules+system},{role:'user',content:JSON.stringify(input)}],response_format:{type:'json_object'},stream:false,max_tokens:2200},signal,30000);
  try{return object(JSON.parse(r.choices[0].message.content))}catch{fail(502,'invalid_model_json')}
 }
 return {
  async text(task,input,signal){const result=await json(prompts[task],input,signal);try{return validateResult(task,result)}catch{fail(502,'invalid_model_schema')}},
  async approve(words,signal){return json('仅审核待公开词语。只返回approved数组，仅原样批准安全词，拒绝姓名、联系方式、地址、账号、隐私、辱骂仇恨色情暴力；拿不准就拒绝。不得新增或修改词语。',{words},signal)},
  async image(prompt,signal){
   const r=await post('ARK','/images/generations',{prompt,size:env.ARK_IMAGE_SIZE||'2048x1152',n:1,response_format:'url',watermark:true},signal,110000);
   let url,u;try{url=string(object(r.data[0]).url,4096);u=new URL(url)}catch{fail(502,'invalid_image_response')}
   const hosts=(env.ARK_IMAGE_HOSTS||'.volces.com,.byteimg.com').split(',').map(x=>x.trim()).filter(Boolean);
   if(u.protocol!=='https:'||u.username||u.password||!hosts.some(h=>h.startsWith('.')?u.hostname.endsWith(h):u.hostname===h))fail(502,'invalid_image_host');
   return url;
  }
 };
}
