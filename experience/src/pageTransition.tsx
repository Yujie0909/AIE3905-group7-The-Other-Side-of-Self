import {useEffect,useRef,useState,type MouseEvent} from 'react';
import {flushSync} from 'react-dom';
import type {Page} from './session';
import {prepareCurrentProfile,getSceneStatus} from './sceneResources';
import './page-transition.css';
type Phase='idle'|'preparing'|'staging'|'animating'|'error';
type Intent={from:Page;to:Page;commit:()=>()=>void;onError:()=>void};
const frames=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
function presented(frame:HTMLElement,page:Page){
 return new Promise<void>((resolve,reject)=>{
  const check=()=>{const main=frame.querySelector<HTMLElement>('main');if(!main)return;const actual=main.classList.contains('page01-stage')?1:Number(main.dataset.staticPage);if(actual!==page)return;if(main.dataset.backgroundError==='true'){done(new Error('Mounted scenery failed'));return}if(main.dataset.backgroundReady==='true'&&main.querySelector<HTMLElement>('[data-scene-motion]')?.dataset.motionReady==='true')done()};
  const observer=new MutationObserver(check),timer=setTimeout(()=>done(new Error('Scene presentation timed out')),45000);
  function done(error?:Error){clearTimeout(timer);observer.disconnect();frame.removeEventListener('scene-presented',check);error?reject(error):resolve()}
  observer.observe(frame,{attributes:true,childList:true,subtree:true});frame.addEventListener('scene-presented',check);check();
 });
}
/** Inert visual copy only: no React effects, recognition sessions or handlers. */
function snapshot(frame:HTMLElement,copyCanvases=true){
 const clone=frame.cloneNode(true) as HTMLElement,prefix=`outgoing-${crypto.randomUUID()}-`;
 const ids=new Map<string,string>();clone.querySelectorAll<HTMLElement>('[id]').forEach(e=>{const old=e.id;ids.set(old,prefix+old);e.id=prefix+old});
 clone.querySelectorAll('*').forEach(e=>{for(const attribute of [...e.attributes]){let value=attribute.value;
  // Computed SVG paint may serialize quoted or absolute fragment URLs.
  value=value.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g,(all,_quote,uri:string)=>{const id=ids.get(uri.slice(uri.lastIndexOf('#')+1));return id?`url(#${id})`:all});
  for(const [old,id]of ids){if(value===`#${old}`)value=`#${id}`;if(['for','aria-labelledby','aria-describedby'].includes(attribute.name))value=value.split(' ').map(v=>v===old?id:v).join(' ')}if(value!==attribute.value)e.setAttribute(attribute.name,value)}});
 const originals=frame.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select');clone.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input,textarea,select').forEach((e,i)=>{e.value=originals[i].value;if(e instanceof HTMLInputElement&&originals[i]instanceof HTMLInputElement)e.checked=(originals[i]as HTMLInputElement).checked});
 // Native transitions already retain the old GPU frame; only the DOM fallback
 // needs a Canvas copy. Avoid a redundant synchronous GPU readback.
 if(copyCanvases)frame.querySelectorAll<HTMLCanvasElement>('canvas').forEach((canvas,i)=>{const target=clone.querySelectorAll('canvas')[i];if(target&&canvas.width&&canvas.height){target.width=canvas.width;target.height=canvas.height;target.getContext('2d')?.drawImage(canvas,0,0)}});
 frame.querySelectorAll<HTMLElement>('[data-dream-loop],.dream-keyword-text,.mic').forEach((node,i)=>{const target=clone.querySelectorAll<HTMLElement>('[data-dream-loop],.dream-keyword-text,.mic')[i],style=getComputedStyle(node);for(const name of ['transform','translate','opacity','stroke-dashoffset','offset-distance','box-shadow'])target.style.setProperty(name,style.getPropertyValue(name))});
 const holder=document.createElement('div'),r=frame.getBoundingClientRect();holder.className='scene-outgoing';holder.dataset.outgoingScene='true';holder.setAttribute('aria-hidden','true');holder.inert=true;clone.inert=true;clone.removeAttribute('aria-busy');clone.style.width='100%';clone.style.position='absolute';clone.style.left='0';clone.style.top=`${r.top}px`;holder.append(clone);return holder;
}
export function usePageTransition(){
 const frameRef=useRef<HTMLDivElement>(null),locked=useRef(false),epoch=useRef(0),alive=useRef(true),intent=useRef<Intent|null>(null);
 const [state,setState]=useState<{phase:Phase;target?:Page}>({phase:'idle'});
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++}},[]);
 async function run(next:Intent){
  if(locked.current)return;
  locked.current=true;intent.current=next;const token=++epoch.current;
  const valid=()=>alive.current&&token===epoch.current;
  const set=(phase:Phase)=>{if(valid())setState({phase,target:next.to})};
  let outgoing:HTMLDivElement|undefined,undo:(()=>void)|undefined;
  const frame=frameRef.current!;
  const scroll={x:window.scrollX,y:window.scrollY};
  performance.mark(`navigation:request:${next.from}-${next.to}`);set(getSceneStatus(next.to)==='ready'&&getSceneStatus(next.from)!=='loading'?'staging':'preparing');
  try{
   if(getSceneStatus(next.from)==='loading')await prepareCurrentProfile(next.from).catch(()=>{});
   await prepareCurrentProfile(next.to);if(!valid())return;
   flushSync(()=>set('staging'));
   const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
   const native=typeof document.startViewTransition==='function'&&!reduce;
   outgoing=snapshot(frame,!native);
   if(!native){outgoing.style.opacity='0';document.body.append(outgoing);await Promise.all([...outgoing.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));await frames();if(!valid())return;}
   const stage=async(waitForPaint:boolean)=>{
    if(!outgoing!.isConnected)document.body.append(outgoing!);outgoing!.style.opacity='1';frame.style.opacity='0';
    const ready=presented(frame,next.to);
    flushSync(()=>{undo=next.commit()});
    // The persistent frame must not inherit a previous scene's mobile scroll.
    // The outgoing copy already preserves its original viewport position.
    window.scrollTo(0,0);
    await ready;if(waitForPaint)await frames();
    if(!valid())return;
   };
   if(native){
    const transition=document.startViewTransition(async()=>{await stage(false);frame.style.removeProperty('opacity');outgoing?.remove();performance.mark(`navigation:present:${next.to}`);set('animating')});
    transition.ready.then(()=>performance.mark(`navigation:animation-begin:${next.to}`)).catch(()=>{});transition.updateCallbackDone.catch(()=>{});await transition.finished;
   }else{
    await stage(true);if(!valid())return;
    frame.style.position='relative';frame.style.zIndex='1001';frame.style.willChange='opacity';performance.mark(`navigation:present:${next.to}`);set('animating');
    if(!reduce){const animation=frame.animate([{opacity:0},{opacity:1}],{duration:360,easing:'cubic-bezier(0.4,0,0.2,1)',fill:'both'});animation.ready.then(()=>performance.mark(`navigation:animation-begin:${next.to}`));await animation.finished;animation.cancel()}
    frame.style.removeProperty('opacity');outgoing.remove();
   }
   if(!valid())return;intent.current=null;locked.current=false;set('idle');performance.mark(`navigation:complete:${next.to}`);document.dispatchEvent(new CustomEvent('scene-navigation-settled',{detail:{page:next.to}}));
  }catch{
   if(!valid())return;
   if(undo){flushSync(undo);window.scrollTo(scroll.x,scroll.y);await presented(frame,next.from).catch(()=>{});await frames()}
   outgoing?.remove();locked.current=false;next.onError();set('error');performance.mark(`navigation:error:${next.to}`);
  }finally{
   frame.style.removeProperty('opacity');frame.style.removeProperty('position');frame.style.removeProperty('z-index');frame.style.removeProperty('will-change');outgoing?.remove();
  }
 }
 function guard(event:MouseEvent){if(locked.current){event.preventDefault();event.stopPropagation()}}
 return {frameRef,state,locked,request:(next:Intent)=>{void run(next)},guard,retry:()=>{if(intent.current)void run(intent.current)},stay:()=>{epoch.current++;locked.current=false;intent.current=null;setState({phase:'idle'})}};
}
export function TransitionFeedback({navigation}:{navigation:ReturnType<typeof usePageTransition>}){
 if(navigation.state.phase==='preparing')return <div className="scene-navigation-status" role="status">正在准备下一页…</div>;
 if(navigation.state.phase==='error')return <div className="scene-navigation-status" role="alert"><span>暂时未能打开下一页。</span><button onClick={navigation.retry}>重试</button><button onClick={navigation.stay}>留在此页</button></div>;
 return null;
}
