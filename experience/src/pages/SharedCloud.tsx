import {useEffect,useRef,useState} from 'react';
import {apiBase,loadCloud,request,textTask} from '../api';
import {cleanWords,type CloudWord} from '../../shared/contracts';
export function useSharedCloud(){
 const [words,setWords]=useState<CloudWord[]>([]),[notice,setNotice]=useState(apiBase?'正在读取共享词云…':'共享词云尚未配置。');
 const refresh=useRef<()=>void>(()=>{});
 useEffect(()=>{
  if(!apiBase)return;let active=true,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
  const update=async()=>{clearTimeout(timer);controller?.abort();if(!active||document.hidden)return;const current=new AbortController();controller=current;
   try{const result=await loadCloud(current.signal);if(active&&!current.signal.aborted){setWords(result);setNotice(result.length?'参与者共享词云':'还没有公开分享的词语。')}}catch{if(active&&!current.signal.aborted)setNotice('暂时无法更新，已保留词云。')}
   finally{if(active&&!current.signal.aborted&&!document.hidden)timer=setTimeout(()=>void update(),20000)}
  };
  const visibility=()=>{clearTimeout(timer);if(document.hidden)controller?.abort();else void update()};refresh.current=()=>void update();document.addEventListener('visibilitychange',visibility);void update();
  return()=>{active=false;clearTimeout(timer);controller?.abort();refresh.current=()=>{};document.removeEventListener('visibilitychange',visibility)};
 },[]);
 return {words,notice,refresh:()=>refresh.current()};
}
type Approval={words:string[];expires:number;approval:string};
export function SharingDialog({suggestions,input,autoOpen,onShared}:{suggestions:string[];input:{ideal:string;daily:string;reflection:string};autoOpen:boolean;onShared:(words:string[])=>void}){
 const [open,setOpen]=useState(autoOpen),[draft,setDraft]=useState(suggestions.slice(0,3)),[approval,setApproval]=useState<Approval|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const lock=useRef(false),controller=useRef<AbortController|null>(null),id=useRef(crypto.randomUUID());
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function run(fn:(signal:AbortSignal)=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setNotice('');const c=new AbortController();controller.current=c;try{await fn(c.signal)}catch(e){if(!c.signal.aborted)setNotice(e instanceof Error?e.message:'请求失败，请重试。')}finally{if(controller.current===c){controller.current=null;lock.current=false;setBusy(false)}}}
 function dismiss(){controller.current?.abort();controller.current=null;lock.current=false;setBusy(false);setOpen(false);setApproval(null);setDraft([]);setNotice('')}
 const begin=()=>{setOpen(true);setDraft(suggestions.slice(0,3));setApproval(null);if(!suggestions.length)void run(async signal=>{const result=await textTask('keywords',input,signal) as {keywords:string[]};setDraft(result.keywords)})};
 return <><button className="cloud-share-trigger static-note" disabled={busy} onClick={begin}>分享词语</button>{open&&<div className="glass-dialog cloud-consent" role="dialog" aria-label="词语分享确认" aria-modal="true">
 <p>愿意将这些词语留在星空，与其他人分享吗？</p>
 {!approval?<><div className="sharing-keywords">{draft.map((w,i)=><label key={i}><input aria-label={`分享词语 ${i+1}`} maxLength={20} value={w} disabled={busy} onChange={e=>setDraft(draft.map((old,j)=>i===j?e.target.value:old))}/><button disabled={busy} aria-label={`删除词语 ${i+1}`} onClick={()=>setDraft(draft.filter((_,j)=>j!==i))}>删除</button></label>)}</div><button disabled={busy||draft.length>=3} onClick={()=>setDraft([...draft,''])}>添加词语</button><button disabled={busy||!draft.some(w=>w.trim())} onClick={()=>void run(async signal=>{const words=cleanWords(draft);const result=await request('/api/wordcloud/preview',{words},signal);const approved=cleanWords(result.words);if(typeof result.approval!=='string'||typeof result.expires!=='number')throw Error('词语审核返回无效。');id.current=crypto.randomUUID();setApproval({words:approved,approval:result.approval,expires:result.expires})})}>检查词语</button></>:<><p>实际将公开的词语：{approval.words.join('、')}</p><button disabled={busy} onClick={()=>setApproval(null)}>返回编辑</button><button disabled={busy} onClick={()=>void run(async signal=>{const result=await request('/api/wordcloud/share',{...approval,requestId:id.current,consent:true},signal);if(result.saved!==true)throw Error('尚未确认数据库写入。');onShared(approval.words);dismiss()})}>愿意分享</button></>}
 <button onClick={dismiss}>不愿意分享</button>{busy&&<p role="status">正在处理…</p>}{notice&&<p role="status">{notice}</p>}
 </div>}</>;
}
