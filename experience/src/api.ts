import {ValidationError,object,string,validateResult,cleanWords,type Task,type CloudWord} from '../shared/contracts';
export const apiBase=(()=>{try{const u=new URL(import.meta.env.VITE_API_BASE_URL||'');return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&/^\/[A-Za-z0-9_/-]*$/.test(u.pathname)?u.href.replace(/\/$/,''):''}catch{return ''}})();
const errors:Record<string,string>={verification_required:'请完成访问验证。',verification_failed:'访问验证失败，请重试。',quota_exceeded:'今天的调用次数已用完，请稍后再试。',text_not_configured:'文字 AI 尚未配置。',image_not_configured:'图像 AI 尚未配置。',backend_not_configured:'后端数据库或限流配置尚未完成。',words_not_public_safe:'这些词暂不适合公开，请修改后再确认。',preview_required:'请重新检查并确认实际分享的词语。',provider_unavailable:'模型服务暂不可用，输入和上一张图片已保留。',upstream_timeout:'模型响应超时，输入和上一张图片已保留。'};
type CaptchaInstance={show:()=>void;destroy?:()=>void};
type CaptchaConstructor=new(id:string,callback:(result:{ret:number;ticket:string;randstr:string})=>void,options:Record<string,unknown>)=>CaptchaInstance;
let script:Promise<void>|undefined,grant:{token:string;expires:number}|undefined;
async function verification(signal?:AbortSignal){
 if(grant&&grant.expires>Date.now()+10000)return grant.token;
 const appId=import.meta.env.VITE_TENCENT_CAPTCHA_APP_ID;if(!appId)throw Error('访问验证尚未配置，请联系网站维护者。');
 if(!script)script=new Promise<void>((resolve,reject)=>{const node=document.createElement('script');node.src='https://turing.captcha.qcloud.com/TCaptcha.js';node.async=true;const timer=setTimeout(()=>{node.remove();script=undefined;reject(Error('访问验证加载超时。'))},10000);node.onload=()=>{clearTimeout(timer);resolve()};node.onerror=()=>{clearTimeout(timer);node.remove();script=undefined;reject(Error('无法加载访问验证。'))};document.head.append(node)});
 await script;if(signal?.aborted)throw new DOMException('Aborted','AbortError');
 const result=await new Promise<{ticket:string;randstr:string}>((resolve,reject)=>{
  let widget:CaptchaInstance|undefined,settled=false;const abort=()=>finish(undefined,new DOMException('Aborted','AbortError'));
  const timer=setTimeout(()=>finish(undefined,Error('访问验证超时，请重试。')),90000);
  function finish(value?:{ticket:string;randstr:string},error?:Error){if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);widget?.destroy?.();error?reject(error):resolve(value!)}
  signal?.addEventListener('abort',abort,{once:true});
  try{const Captcha=(window as unknown as {TencentCaptcha:CaptchaConstructor}).TencentCaptcha;widget=new Captcha(appId,r=>r.ret===0?finish({ticket:r.ticket,randstr:r.randstr}):finish(undefined,Error('访问验证已取消，请重试。')),{needFeedBack:false});widget.show()}catch{finish(undefined,Error('访问验证不可用。'))}
 });
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(()=>controller.abort(),15000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 try{
  const response=await fetch(apiBase+'/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result),signal:controller.signal,credentials:'omit'});
  const body=object(await response.json());if(!response.ok)throw Error(errors[String(body.error)]||'访问验证暂不可用，请稍后重试。');
  grant={token:string(body.token,2048),expires:Number(body.expires)};if(!Number.isSafeInteger(grant.expires)||grant.expires<Date.now()||grant.expires>Date.now()+310000){grant=undefined;throw Error('访问验证响应无效。')}return grant.token;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export async function request(path:string,body?:unknown,signal?:AbortSignal,timeout=35000):Promise<Record<string,unknown>>{
 if(!apiBase)throw Error('后端尚未配置。网站仍可浏览，输入仅保留在本次会话。');
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();signal?.addEventListener('abort',abort,{once:true});let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const token=body?await verification(controller.signal):undefined;
  timer=setTimeout(abort,timeout);
  const response=await fetch(apiBase+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Flow-Token':token!}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
  const result=object(await response.json());if(response.status===403)grant=undefined;if(!response.ok)throw Error(errors[String(result.error)]||'服务暂不可用，请稍后重试。');return result;
 }catch(e){if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(controller.signal.aborted)throw Error('请求超时，请重试。输入和上一张有效图片已保留。');if(e instanceof TypeError||e instanceof SyntaxError||e instanceof ValidationError)throw Error('服务返回格式无效或网络不可达，请稍后重试。');throw e}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
export async function textTask(task:Task,input:unknown,signal:AbortSignal){const r=await request('/api/text',{task,input},signal);return validateResult(task,r.result)}
export async function generateImage(prompt:string,signal:AbortSignal){const r=await request('/api/image',{prompt,requestId:crypto.randomUUID()},signal,125000);const url=string(r.url,4096);if(new URL(url).protocol!=='https:')throw Error('图像地址无效。');await new Promise<void>((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>end(Error('图像加载超时。')),20000);const abort=()=>end(new DOMException('Aborted','AbortError'));function end(e?:Error){clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;e?reject(e):resolve()}signal.addEventListener('abort',abort,{once:true});image.onload=()=>image.decode().then(()=>end(),()=>end(Error('图像无法解码。')));image.onerror=()=>end(Error('图像暂时无法显示。'));if(signal.aborted){abort();return}image.referrerPolicy='no-referrer';image.src=url});return url}
export async function loadCloud(signal:AbortSignal):Promise<CloudWord[]>{const r=await request('/api/wordcloud',undefined,signal,10000);if(!Array.isArray(r.words)||r.words.length>18)throw Error('词云数据无效。');return r.words.map(v=>{const x=object(v),word=cleanWords([x.word])[0],frequency=Number(x.frequency);if(!Number.isSafeInteger(frequency)||frequency<1)throw Error('词频无效。');return {word,frequency}})}
