import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {Page} from './session';
import {backgroundAssets} from './backgroundAssets';

import {prepareScene,getSceneStatus,getPreparedImage} from './sceneResources';
export {decodeBackground} from './sceneResources';

export interface BackgroundFrame{page:Page;artwork:boolean;objectPosition:string;shade:string;mobileShade:string}
let lastFrame:BackgroundFrame|null=null;
function mark(name:string){performance.mark(name)}

/** Presentation readiness only; never changes session state or navigation callbacks. */
export function useSceneBackground(page:Page){
 const rootRef=useRef<HTMLElement>(null),plateRef=useRef<HTMLImageElement>(null);
 const [wide,setWide]=useState(()=>matchMedia('(min-width:701px)').matches);
 const [readyKey,setReadyKey]=useState(''),[errorKey,setErrorKey]=useState('');
 const key=`${page}:${wide}`,source=backgroundAssets[page];
 const ready=readyKey===key;
 useEffect(()=>{const media=matchMedia('(min-width:701px)'),change=()=>setWide(media.matches);media.addEventListener('change',change);change();return()=>media.removeEventListener('change',change)},[]);
 useLayoutEffect(()=>{
  let cancelled=false;
  mark(`background:request:${String(page).padStart(2,'0')}`);
  const present=()=>{
   if(cancelled)return;
   const root=rootRef.current,image=plateRef.current;if(!root||!image)return;
   const pseudo=getComputedStyle(root,'::before'),mobile=root.querySelector<HTMLElement>('.static-mobile-shade,.page01-mobile-shade');
   lastFrame={page,artwork:wide&&Boolean(source.artwork),objectPosition:getComputedStyle(image).objectPosition,shade:pseudo.content!=='none'&&pseudo.display!=='none'?pseudo.backgroundImage:'none',mobileShade:mobile&&getComputedStyle(mobile).display!=='none'?getComputedStyle(mobile).backgroundImage:'none'};
   mark(`background:decoded:${String(page).padStart(2,'0')}`);setReadyKey(key);setErrorKey('');
  };
  const show=async()=>{
   const image=plateRef.current;
   // The newly mounted element shares the prepared URL's decoded resource.
   // Only ask it to decode when it has not yet attached that ready resource.
   if(!image?.complete||!image.naturalWidth)await image?.decode();
   present();
  };
  if(getSceneStatus(page,wide)==='ready'&&getPreparedImage(source.plate)&&plateRef.current?.complete&&plateRef.current.naturalWidth)present();
  else prepareScene(page,wide).then(show).catch(()=>{if(!cancelled)setErrorKey(key)});
  return()=>{cancelled=true};
 },[key,page,wide,source]);
 useLayoutEffect(()=>{if(ready)rootRef.current?.dispatchEvent(new CustomEvent('scene-presented',{bubbles:true,detail:{page}}))},[ready,page]);
 useEffect(()=>{
  if(!ready)return;
  document.getElementById('initial-background')?.remove();document.documentElement.removeAttribute('data-initial-background');
  let cancelled=false,second=0,idle=0,timer:ReturnType<typeof setTimeout>|undefined;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   if(cancelled)return;mark(`background:paint:${String(page).padStart(2,'0')}`);
   if(page===7)return;
   const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
   if(connection?.saveData||connection?.effectiveType?.includes('2g'))return;
   {
    if(cancelled)return;
    const warm=()=>{if(cancelled)return;const next=(page+1) as Page;mark(`background:prefetch:${String(next).padStart(2,'0')}`);prepareScene(next,wide,'low').catch(()=>{})};
    // Current scenery has painted: use idle bandwidth during its crossfade,
    // rather than postponing the next image until the transition has ended.
    if('requestIdleCallback'in window)idle=window.requestIdleCallback(warm,{timeout:750});else timer=setTimeout(warm,0);
   }
  })});
  return()=>{cancelled=true;cancelAnimationFrame(first);cancelAnimationFrame(second);if(idle)window.cancelIdleCallback(idle);if(timer)clearTimeout(timer)};
 },[ready,page,wide]);
 return {rootRef,plateRef,source,wide,ready,error:errorKey===key,previous:ready?null:lastFrame};
}
