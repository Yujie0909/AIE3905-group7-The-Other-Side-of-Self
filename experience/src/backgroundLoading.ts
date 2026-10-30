import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {Page} from './session';
import {backgroundAssets} from './backgroundAssets';

type Priority='high'|'low';
type Asset={image:HTMLImageElement;promise:Promise<void>};
const assets=new Map<string,Asset>();
export function decodeBackground(url:string,priority:Priority='high'):Promise<void>{
 const existing=assets.get(url);
 if(existing){if(priority==='high')existing.image.fetchPriority='high';return existing.promise.then(()=>existing.image.decode())}
 const image=new Image();image.decoding='async';image.fetchPriority=priority;
 const promise=new Promise<void>((resolve,reject)=>{image.onload=()=>image.decode().then(resolve,reject);image.onerror=()=>reject(new Error('Background asset failed: '+url))});
 const record={image,promise};assets.set(url,record);image.src=url;
 promise.catch(()=>{if(assets.get(url)===record)assets.delete(url)});
 return promise;
}
export interface BackgroundFrame{page:Page;artwork:boolean;objectPosition:string;shade:string;mobileShade:string}
let lastFrame:BackgroundFrame|null=null,nextScheduled=false;
function mark(name:string){performance.mark(name)}

/** Presentation readiness only; never changes session state or navigation callbacks. */
export function useSceneBackground(page:Page){
 const rootRef=useRef<HTMLElement>(null),plateRef=useRef<HTMLImageElement>(null);
 const [wide,setWide]=useState(()=>matchMedia('(min-width:701px)').matches);
 const [readyKey,setReadyKey]=useState(''),[errorKey,setErrorKey]=useState('');
 const key=`${page}:${wide}`,source=backgroundAssets[page];
 const ready=readyKey===key;
 useEffect(()=>{const media=matchMedia('(min-width:701px)'),change=()=>setWide(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[]);
 useLayoutEffect(()=>{
  let cancelled=false;
  const urls=[source.plate,...(wide&&source.artwork?[source.artwork]:[])];
  mark(`background:request:${String(page).padStart(2,'0')}`);
  Promise.all(urls.map(url=>decodeBackground(url))).then(async()=>{
   await plateRef.current?.decode();if(cancelled)return;
   const root=rootRef.current,image=plateRef.current;if(!root||!image)return;
   const pseudo=getComputedStyle(root,'::before'),mobile=root.querySelector<HTMLElement>('.static-mobile-shade,.page01-mobile-shade');
   lastFrame={page,artwork:wide&&Boolean(source.artwork),objectPosition:getComputedStyle(image).objectPosition,shade:pseudo.content!=='none'&&pseudo.display!=='none'?pseudo.backgroundImage:'none',mobileShade:mobile&&getComputedStyle(mobile).display!=='none'?getComputedStyle(mobile).backgroundImage:'none'};
   mark(`background:decoded:${String(page).padStart(2,'0')}`);setReadyKey(key);setErrorKey('');
  }).catch(()=>{if(!cancelled)setErrorKey(key)});
  return()=>{cancelled=true;for(const url of urls){const asset=assets.get(url);if(asset)asset.image.fetchPriority='low'}};
 },[key,page,wide,source]);
 useEffect(()=>{
  if(!ready)return;
  document.getElementById('initial-background')?.remove();document.documentElement.removeAttribute('data-initial-background');
  let cancelled=false,second=0,idle=0,timer:ReturnType<typeof setTimeout>|undefined;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   if(cancelled)return;mark(`background:paint:${String(page).padStart(2,'0')}`);
   if(page!==1||nextScheduled)return;
   const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
   if(connection?.saveData||connection?.effectiveType?.includes('2g'))return;
   document.fonts.ready.then(()=>{
    if(cancelled)return;
    const warm=()=>{if(cancelled||nextScheduled)return;nextScheduled=true;mark('background:prefetch:02');const next=backgroundAssets[2];Promise.all([decodeBackground(next.plate,'low'),...(wide&&next.artwork?[decodeBackground(next.artwork,'low')]:[])]).catch(()=>{nextScheduled=false})};
    if('requestIdleCallback' in window)idle=window.requestIdleCallback(warm);else timer=setTimeout(warm,0);
   });
  })});
  return()=>{cancelled=true;cancelAnimationFrame(first);cancelAnimationFrame(second);if(idle)window.cancelIdleCallback(idle);if(timer)clearTimeout(timer)};
 },[ready,page,wide]);
 return {rootRef,plateRef,source,wide,ready,error:errorKey===key,previous:ready?null:lastFrame};
}
