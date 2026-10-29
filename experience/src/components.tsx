import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Page} from './session';
export function PersistentScene({page,variant,reduced,playback}:{page:Page;variant:number;reduced:boolean;playback:number}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const move=(e:PointerEvent)=>{if(!reduced){ref.current?.style.setProperty('--mx',`${(e.clientX/innerWidth-.5)*12}px`);ref.current?.style.setProperty('--my',`${(e.clientY/innerHeight-.5)*8}px`)}};window.addEventListener('pointermove',move);return()=>window.removeEventListener('pointermove',move)},[reduced]);
 return <div ref={ref} className={`scene scene-${page} ${reduced?'still':''}`} style={{'--variant':variant,'--evolution':reduced?0:playback} as React.CSSProperties} aria-hidden="true"><div className="architecture"/><div className="light-halo"/><div className="light-window"><div className="horizon"/></div><div className="beam"/><div className="water"><div className="reflection"/>{Array.from({length:10},(_,i)=><i key={i} style={{top:`${8+i*9}%`,animationDelay:`${i*-1.7}s`}}/>)}</div><div className="mist mist-one"/><div className="mist mist-two"/><svg className="light-curves" viewBox="0 0 1200 800" preserveAspectRatio="none"><path d="M 280 700 C 1100 640, 290 190, 920 140"/><path d="M 310 720 C 1120 650, 320 210, 950 150"/></svg><div className="particles">{Array.from({length:16},(_,i)=><i key={i} style={{left:`${30+(i*37)%65}%`,top:`${10+(i*19)%75}%`,animationDelay:`${-i*2}s`}}/>)}</div><div className="vignette"/></div>
}
export const SceneBackground=PersistentScene;
export function PageHeader({number,title,en,body}:{number:number;title:string;en:string;body:string[]}){return <header className="page-header"><div className="eyebrow"><span className="page-number">{String(number).padStart(2,'0')}</span><span className="eyebrow-line"/>{en}</div><h1 tabIndex={-1}>{title}</h1><div className="body-copy">{body.map(t=><p key={t}>{t}</p>)}</div></header>}
export function PageShell({children}:{children:ReactNode}){return <main className="page-shell">{children}</main>}
export function PrimaryButton({children,onClick,disabled=false}:{children:ReactNode;onClick:()=>void;disabled?:boolean}){return <button className="primary" onClick={onClick} disabled={disabled}>{children}<span aria-hidden="true">↗</span></button>}
export function JourneyProgress({page}:{page:Page}){return <div className="journey" aria-label={`旅程进度，第 ${page} 幕，共 7 幕`}><div className="journey-label"><span>THE OTHER SIDE OF SELF</span><span>{String(page).padStart(2,'0')} <b>/</b> 07</span></div><div className="progress-track">{Array.from({length:7},(_,i)=><span key={i} className={i<page?'passed':''}/>)}</div></div>}
export function TextInput({value,onChange,label,placeholder}:{value:string;onChange:(v:string)=>void;label:string;placeholder?:string}){return <label className="text-input"><span>{label}</span><textarea maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/><small>{value.length} / 2000</small></label>}
export const TextInputPanel=TextInput;
type Recognition={lang:string;interimResults:boolean;onresult:((e:any)=>void)|null;onerror:((e:any)=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void};
export function VoiceInput({onText}:{onText:(v:string)=>void}){
 const [listening,setListening]=useState(false),[notice,setNotice]=useState('');const rec=useRef<Recognition|null>(null);
 const ctor=()=> (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 useEffect(()=>{if(!ctor())setNotice('此浏览器不支持语音识别，请使用文字输入。');return()=>rec.current?.stop()},[]);
 function toggle(){if(listening){rec.current?.stop();return}const Ctor=ctor();if(!Ctor())return;const r:Recognition=new Ctor();r.lang='zh-CN';r.interimResults=false;r.onresult=e=>onText(e.results[0][0].transcript);r.onerror=()=>{setNotice('语音识别暂不可用或权限未开启，请使用文字输入。');setListening(false)};r.onend=()=>setListening(false);rec.current=r;try{r.start();setListening(true);setNotice('正在聆听，再次点击结束。识别结果可在下方编辑。')}catch{setNotice('无法启动语音，请使用文字输入。')}}
 return <div className="voice-input"><button className={`mic ${listening?'listening':''}`} onClick={toggle} disabled={!ctor()} aria-label={listening?'停止语音输入':'开始语音输入'} aria-pressed={listening}><svg width="22" height="30" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="8" y="2" width="8" height="17" rx="4"/><path d="M4 13v3a8 8 0 0 0 16 0v-3M12 24v6M7 30h10"/></svg></button><p>{listening?'正在聆听你的声音':'让想法，慢慢浮现'}</p><small>{notice||'点击麦克风，或在下方写下你的想法。语音识别可能由浏览器服务处理。'}</small></div>
}
export const VoiceRecorder=VoiceInput;
export function TransitionLayer({active}:{active:boolean}){return <div className={`transition-layer ${active?'active':''}`} aria-hidden="true"/>}
