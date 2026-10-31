import {useEffect,useRef,useState,type RefObject} from 'react';

type Phase='idle'|'requesting'|'recording'|'recognizing'|'success'|'error';
type Result={isFinal:boolean;0:{transcript:string}};
type Recognition={lang:string;continuous:boolean;interimResults:boolean;onstart:(()=>void)|null;onresult:((event:{results:ArrayLike<Result>})=>void)|null;onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;onspeechend:(()=>void)|null;start:()=>void;stop:()=>void;abort?:()=>void};
type Session={prefix:string;expected:string;finalText:string;interim:string;stream?:MediaStream;recognition?:Recognition;timer?:ReturnType<typeof setTimeout>;observer?:MutationObserver;stopping:boolean};
const recognitionConstructor=()=>{const w=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};return w.SpeechRecognition||w.webkitSpeechRecognition};
const privacy='语音识别可能将麦克风音频发送至浏览器提供商的语音服务。本网站不录制、保存或另行上传原始音频。是否同意并开始识别？';

// Web Speech returns a cumulative result list, not a new fragment to append.
export function recognitionDraft(prefix:string,results:ArrayLike<Result>){
 const all=Array.from(results),finalText=all.filter(x=>x.isFinal).map(x=>x[0].transcript).join(''),interim=all.filter(x=>!x.isFinal).map(x=>x[0].transcript).join('');
 return {finalText,interim,text:(prefix+finalText+interim).slice(0,2000)};
}

function errorMessage(error:unknown){
 const name=error instanceof DOMException?error.name:String(error);
 if(['NotAllowedError','PermissionDeniedError','not-allowed','service-not-allowed'].includes(name))return '麦克风或语音服务权限被拒绝，请允许访问或使用文字输入。';
 if(['NotFoundError','DevicesNotFoundError'].includes(name))return '未检测到可用麦克风，请连接设备或使用文字输入。';
 if(name==='audio-capture')return '浏览器语音服务无法采集音频，请重试或使用文字输入。';
 if(['NotReadableError','TrackStartError'].includes(name))return '麦克风被占用或无法读取，请关闭占用程序或使用文字输入。';
 if(name==='network')return '浏览器语音服务连接失败，请使用文字输入。';
 if(name==='no-speech')return '没有识别到语音，请重试或使用文字输入。';
 return '语音识别暂不可用，请重试或使用文字输入。';
}

/** Device capture and native recognition only; no recorder, audio blob, upload,
 * fabricated transcript, audio-level loop, or global event listener. */
export function useMicrophoneInput(value:string,onChange:(text:string)=>void,owner:RefObject<HTMLDivElement|null>){
 const [phase,setPhase]=useState<Phase>('idle'),[notice,setNotice]=useState('');
 const session=useRef<Session|null>(null),mounted=useRef(false),live=useRef({value,onChange});live.current={value,onChange};
 const pending=['requesting','recording','recognizing'].includes(phase);
 function tracks(s:Session){const stream=s.stream;s.stream=undefined;for(const track of stream?.getTracks()||[]){track.onended=null;track.stop()}}
 function cleanup(s:Session){
  clearTimeout(s.timer);s.observer?.disconnect();tracks(s);
  const r=s.recognition;s.recognition=undefined;
  if(r){r.onstart=r.onresult=r.onerror=r.onend=r.onspeechend=null;try{if(r.abort)r.abort();else r.stop()}catch{/* Already ended. */}}
 }
 function finish(s:Session,state:Phase,message:string,commitFinal=false){
  if(session.current!==s)return;session.current=null;cleanup(s);
  if(commitFinal){const next=(s.prefix+s.finalText).slice(0,2000);s.expected=next;live.current.onChange(next)}
  if(mounted.current){setPhase(state);setNotice(message)}
 }
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;const s=session.current;session.current=null;if(s)cleanup(s)}},[]);
 // A user's edit wins over late recognition events, including pending permission.
 useEffect(()=>{const s=session.current;if(s&&value!==s.expected)finish(s,'idle','已保留你的修改，可继续文字输入。')},[value]);

 function stop(){
  const s=session.current;if(!s||s.stopping)return;s.stopping=true;tracks(s);
  if(!s.recognition){finish(s,'idle','音频采集已停止，未进行转写或保存。');return}
  setPhase('recognizing');setNotice('正在完成识别，请稍候…');
  s.timer=setTimeout(()=>finish(s,s.finalText?'success':'error',s.finalText?'已识别的文字可编辑后提交。':'识别未完成，请使用文字输入。',Boolean(s.finalText)),4000);
  try{s.recognition.stop()}catch{finish(s,'error','无法完成识别，请使用文字输入。')}
 }

 async function start(){
  if(session.current)return;
  if(!window.isSecureContext){setPhase('error');setNotice('麦克风需要 HTTPS 安全连接，请使用文字输入。');return}
  if(!navigator.mediaDevices?.getUserMedia){setPhase('error');setNotice('此浏览器无法访问麦克风，请使用文字输入。');return}
  if(live.current.value.length>=2000){setPhase('error');setNotice('输入已达长度上限，请先编辑文字。');return}
  const Ctor=recognitionConstructor();
  // Permission to open a local device is NOT consent to remote recognition.
  if(Ctor&&!window.confirm(privacy)){setPhase('idle');setNotice('未启动语音识别，可继续文字输入。');return}
  const s:Session={prefix:live.current.value,expected:live.current.value,finalText:'',interim:'',stopping:false};session.current=s;
  setPhase('requesting');setNotice('正在请求麦克风权限，再次点击可取消。');
  const frame=owner.current?.closest<HTMLElement>('.scene-frame');
  if(frame){s.observer=new MutationObserver(()=>{if(frame.dataset.navigationState!=='idle')finish(s,'idle','')});s.observer.observe(frame,{attributes:true,attributeFilter:['data-navigation-state']})}
  const current=()=>mounted.current&&session.current===s;
  try{
   try{const permission=await navigator.permissions?.query({name:'microphone' as PermissionName});if(!current())return;if(permission?.state==='denied')throw new DOMException('Denied','NotAllowedError')}
   catch(error){if(error instanceof DOMException&&error.name==='NotAllowedError')throw error;/* Safari may not expose microphone permission queries. */}
   if(!current())return;
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!current()){stream.getTracks().forEach(t=>t.stop());return}
   s.stream=stream;
   if(!stream.getAudioTracks().some(t=>t.readyState==='live'))throw new DOMException('No live audio track','NotFoundError');
   if(!Ctor){
    for(const track of stream.getAudioTracks())track.onended=()=>finish(s,'error','麦克风采集中断，请使用文字输入。');
    setPhase('recording');setNotice('正在采集音频（不支持转写）；点击停止。');return;
   }
   // Standard Web Speech opens its own input: release the permission probe
   // first so devices with exclusive capture are not left open twice.
   tracks(s);
   const r=new Ctor();s.recognition=r;r.lang='zh-CN';r.continuous=true;r.interimResults=true;
   r.onstart=()=>{if(current()){setPhase('recording');setNotice('正在聆听，再次点击结束。')}};
   r.onspeechend=()=>{if(current()){setPhase('recognizing');setNotice('正在识别，文字会显示在输入框中。')}};
   r.onresult=event=>{
    if(!current())return;
    const draft=recognitionDraft(s.prefix,event.results);s.finalText=draft.finalText;s.interim=draft.interim;s.expected=draft.text;live.current.onChange(draft.text);
    setPhase(s.interim||s.stopping?'recognizing':'recording');setNotice(s.interim?'识别中，临时文字会自动更新。':'文字已更新，停止后可编辑提交。');
   };
   r.onerror=event=>{if(current())finish(s,'error',errorMessage(event.error))};
   r.onend=()=>{if(current())finish(s,s.finalText?'success':'error',s.finalText?'识别完成，可编辑文字后提交。':'未取得最终识别结果，请重试或使用文字输入。',true)};
   r.start();
  }catch(error){if(current())finish(s,'error',errorMessage(error))}
 }
 return {phase,notice,pending,toggle:()=>{if(session.current)stop();else void start()}};
}
