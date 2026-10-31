import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Page} from './session';
export function PageHeader({number,title,en,body}:{number:number;title:string;en:string;body:string[]}){return <header className="page-header"><div className="eyebrow"><span className="page-number">{String(number).padStart(2,'0')}</span><span className="eyebrow-line"/>{en}</div><h1 tabIndex={-1}>{title}</h1><div className="body-copy">{body.map(t=><p key={t}>{t}</p>)}</div></header>}
export function PageShell({children}:{children:ReactNode}){return <main className="page-shell">{children}</main>}
export function PrimaryButton({children,onClick,disabled=false}:{children:ReactNode;onClick:()=>void;disabled?:boolean}){return <button className="primary" onClick={onClick} disabled={disabled}>{children}<span aria-hidden="true">↗</span></button>}
export function JourneyProgress({page}:{page:Page}){return <div className="journey" aria-label={`旅程进度，第 ${page} 幕，共 7 幕`}><div className="journey-label"><span>THE OTHER SIDE OF SELF</span><span>{String(page).padStart(2,'0')} <b>/</b> 07</span></div><div className="progress-track">{Array.from({length:7},(_,i)=><span key={i} className={i<page?'passed':''}/>)}</div></div>}
export function TextInput({value,onChange,label,placeholder}:{value:string;onChange:(v:string)=>void;label:string;placeholder?:string}){return <label className="text-input"><span>{label}</span><textarea maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/><small>{value.length} / 2000</small></label>}
export const TextInputPanel=TextInput;
type Recognition={onstart?:()=>void;lang:string;interimResults:boolean;onresult:((e:any)=>void)|null;onerror:((e:any)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
export function VoiceInput({onText}:{onText:(v:string)=>void}){
 const [listening,setListening]=useState(false),[active,setActive]=useState(false),[notice,setNotice]=useState('');const rec=useRef<Recognition|null>(null);
 useEffect(()=>{document.documentElement.dataset.listening=String(listening);return()=>{delete document.documentElement.dataset.listening}},[listening]);
 const ctor=()=> (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 useEffect(()=>{if(!ctor())setNotice('此浏览器不支持语音识别，请使用文字输入。');return()=>rec.current?.stop()},[]);
 function toggle(){if(listening){rec.current?.stop();return}const Ctor=ctor();if(!Ctor)return;const r:Recognition=new Ctor();r.lang='zh-CN';r.interimResults=false;r.onstart=()=>setActive(true);r.onresult=e=>onText(e.results[0][0].transcript);r.onerror=()=>{setNotice('语音识别暂不可用或权限未开启，请使用文字输入。');setListening(false);setActive(false)};r.onend=()=>{setListening(false);setActive(false)};rec.current=r;try{r.start();setListening(true);setNotice('正在聆听，再次点击结束。识别结果可在下方编辑。')}catch{setNotice('无法启动语音，请使用文字输入。')}}
 return <div className="voice-input" data-recognition-active={active} data-notice={Boolean(notice)}><button className={`mic ${listening?'listening':''}`} onClick={toggle} disabled={!ctor()} aria-label={listening?'停止语音输入':'开始语音输入'} aria-pressed={listening}><svg width="22" height="30" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="8" y="2" width="8" height="17" rx="4" className="microphone-body"/><path d="M4 13v3a8 8 0 0 0 16 0v-3M12 24v6M7 30h10"/></svg></button><p>{listening?'正在聆听你的声音':'让想法，慢慢浮现'}</p><small>{notice||'点击麦克风，或在下方写下你的想法。语音识别可能由浏览器服务处理。'}</small></div>
}
export const VoiceRecorder=VoiceInput;
export function TransitionLayer({active}:{active:boolean}){return <div className={`transition-layer ${active?'active':''}`} aria-hidden="true"/>}
