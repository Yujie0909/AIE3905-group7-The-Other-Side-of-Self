import {ValidationError,object,string,validateResult,cleanWords,type Task,type CloudWord} from '../shared/contracts';
export const apiBase=(()=>{try{const u=new URL(import.meta.env.VITE_API_BASE_URL||'');return u.protocol==='https:'&&!u.username&&!u.password?u.href.replace(/\/$/,''):''}catch{return ''}})();
const errors:Record<string,string>={verification_required:'请完成访问验证。',verification_failed:'访问验证失败，请重试。',quota_exceeded:'今天的调用次数已用完，请稍后再试。',text_not_configured:'文字 AI 尚未配置。',image_not_configured:'图像 AI 尚未配置。',backend_not_configured:'后端数据库或限流配置尚未完成。',words_not_public_safe:'这些词暂不适合公开，请修改后再确认。',preview_required:'请重新检查并确认实际分享的词语。',provider_unavailable:'模型服务暂不可用，输入和上一张图片已保留。',upstream_timeout:'模型响应超时，输入和上一张图片已保留。'};
type Turnstile={render:(node:HTMLElement,options:Record<string,unknown>)=>string;execute:(id:string)=>void;remove:(id:string)=>void};
let script:Promise<void>|undefined;
async function verification(signal?:AbortSignal){
 const sitekey=import.meta.env.VITE_TURNSTILE_SITE_KEY;if(!sitekey)throw Error('访问验证尚未配置，请联系网站维护者。');
 if(!script)script=new Promise<void>((resolve,reject)=>{const node=document.createElement('script');node.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';node.async=true;const timer=setTimeout(()=>{node.remove();script=undefined;reject(Error('访问验证加载超时。'))},10000);node.onload=()=>{clearTimeout(timer);resolve()};node.onerror=()=>{clearTimeout(timer);node.remove();script=undefined;reject(Error('无法加载访问验证。'))};document.head.append(node)});
 await script;if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 return new Promise<string>((resolve,reject)=>{
  const host=document.createElement('div');host.className='verification-widget';document.body.append(host);const t=(window as unknown as {turnstile:Turnstile}).turnstile;let id:string|undefined,settled=false;
  const end=(token?:string,error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);if(id)t.remove(id);host.remove();error?reject(error):resolve(token!)};
  const abort=()=>end(undefined,new DOMException('Aborted','AbortError')),timer=setTimeout(()=>end(undefined,Error('访问验证超时，请重试。')),90000);signal?.addEventListener('abort',abort,{once:true});
  try{id=t.render(host,{sitekey,execution:'execute',appearance:'interaction-only',action:'flow_submit',callback:(token:string)=>end(token),'error-callback':()=>end(undefined,Error('访问验证失败，请重试。')),'expired-callback':()=>end(undefined,Error('访问验证已过期，请重试。'))});t.execute(id)}catch{end(undefined,Error('访问验证不可用。'))}
 });
}
export async function request(path:string,body?:unknown,signal?:AbortSignal,timeout=35000):Promise<Record<string,unknown>>{
 if(!apiBase)throw Error('后端尚未配置。网站仍可浏览，输入仅保留在本次会话。');
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const token=body?await verification(controller.signal):undefined;
  timer=setTimeout(abort,timeout);
  const response=await fetch(apiBase+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Turnstile-Token':token!}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  const result=object(await response.json());if(!response.ok)throw Error(errors[String(result.error)]||'服务暂不可用，请稍后重试。');return result;
 }catch(e){if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(controller.signal.aborted)throw Error('请求超时，请重试。输入和上一张有效图片已保留。');if(e instanceof TypeError||e instanceof SyntaxError||e instanceof ValidationError)throw Error('服务返回格式无效或网络不可达，请稍后重试。');throw e}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export async function textTask(task:Task,input:unknown,signal:AbortSignal){const r=await request('/api/text',{task,input},signal);return validateResult(task,r.result)}
export async function generateImage(prompt:string,signal:AbortSignal){const r=await request('/api/image',{prompt,requestId:crypto.randomUUID()},signal,125000);const url=string(r.url,4096);if(new URL(url).protocol!=='https:')throw Error('图像地址无效。');await new Promise<void>((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>end(Error('图像加载超时。')),20000);const abort=()=>end(new DOMException('Aborted','AbortError'));function end(e?:Error){clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;e?reject(e):resolve()}signal.addEventListener('abort',abort,{once:true});image.onload=()=>image.decode().then(()=>end(),()=>end(Error('图像无法解码。')));image.onerror=()=>end(Error('图像暂时无法显示。'));if(signal.aborted){abort();return}image.referrerPolicy='no-referrer';image.src=url});return url}
export async function loadCloud(signal:AbortSignal):Promise<CloudWord[]>{const r=await request('/api/wordcloud',undefined,signal,10000);if(!Array.isArray(r.words)||r.words.length>18)throw Error('词云数据无效。');return r.words.map(v=>{const x=object(v),word=cleanWords([x.word])[0],frequency=Number(x.frequency);if(!Number.isSafeInteger(frequency)||frequency<1)throw Error('词频无效。');return {word,frequency}})}
