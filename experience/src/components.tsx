import {useId,useRef,type ReactNode} from 'react';
import {useMicrophoneInput} from './useMicrophoneInput';
import './voice-feedback.css';
import type {Page} from './session';
export function PageHeader({number,title,en,body}:{number:number;title:string;en:string;body:string[]}){return <header className="page-header"><div className="eyebrow"><span className="page-number">{String(number).padStart(2,'0')}</span><span className="eyebrow-line"/>{en}</div><h1 tabIndex={-1}>{title}</h1><div className="body-copy">{body.map(t=><p key={t}>{t}</p>)}</div></header>}
export function PageShell({children}:{children:ReactNode}){return <main className="page-shell">{children}</main>}
export function PrimaryButton({children,onClick,disabled=false}:{children:ReactNode;onClick:()=>void;disabled?:boolean}){return <button className="primary" onClick={onClick} disabled={disabled}>{children}<span aria-hidden="true">↗</span></button>}
export function JourneyProgress({page}:{page:Page}){return <div className="journey" aria-label={`旅程进度，第 ${page} 幕，共 7 幕`}><div className="journey-label"><span>THE OTHER SIDE OF SELF</span><span>{String(page).padStart(2,'0')} <b>/</b> 07</span></div><div className="progress-track">{Array.from({length:7},(_,i)=><span key={i} className={i<page?'passed':''}/>)}</div></div>}
export function TextInput({value,onChange,label,placeholder}:{value:string;onChange:(v:string)=>void;label:string;placeholder?:string}){return <label className="text-input"><span>{label}</span><textarea maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/><small>{value.length} / 2000</small></label>}
export const TextInputPanel=TextInput;
export function VoiceInput({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const owner=useRef<HTMLDivElement>(null),description=useId();
 const {phase,notice,pending,toggle}=useMicrophoneInput(value,onChange,owner);
 return <div ref={owner} className="voice-input" data-voice-state={phase} data-recognition-active={phase==='recording'} data-notice={Boolean(notice)}><button className={`mic ${pending?'listening':''}`} onClick={toggle} aria-label={pending?'停止语音输入':'开始语音输入'} aria-pressed={pending} aria-describedby={description}><svg width="22" height="30" viewBox="0 0 24 32" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="8" y="2" width="8" height="17" rx="4" className="microphone-body"/><path d="M4 13v3a8 8 0 0 0 16 0v-3M12 24v6M7 30h10"/></svg></button><p>{pending?'正在聆听你的声音':'让想法，慢慢浮现'}</p><small id={description} role="status" aria-live="polite">{notice||'点击麦克风，或在下方写下你的想法。语音识别可能由浏览器服务处理。'}</small></div>
}
export const VoiceRecorder=VoiceInput;
export function TransitionLayer({active}:{active:boolean}){return <div className={`transition-layer ${active?'active':''}`} aria-hidden="true"/>}
