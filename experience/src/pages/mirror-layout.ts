import {useLayoutEffect,useState} from 'react';
import type {RefObject} from 'react';
export const mirrorScene={width:1672,height:941};
export interface MirrorCamera{width:number;height:number;scale:number;dx:number;dy:number;drawWidth:number;drawHeight:number}
/** Read the actual cover camera, including its responsive crop and fallback. */
export function useMirrorCamera(owner:RefObject<Element|null>,enabled=true){
 const [camera,setCamera]=useState<MirrorCamera|null>(null);
 useLayoutEffect(()=>{
  if(!enabled)return;
  const node=owner.current,fallback=node?.closest('.background-fallback');
  const image=fallback?fallback.querySelector<HTMLImageElement>('.background-fallback-image'):node?.closest('main')?.querySelector<HTMLImageElement>(':scope > .static-environment');
  if(!image)return;
  let active=true;
  const read=()=>{if(!active)return;const r=image.getBoundingClientRect();if(!r.width||!r.height)return;const s=Math.max(r.width/mirrorScene.width,r.height/mirrorScene.height),p=getComputedStyle(image).objectPosition.split(' ').map(v=>Number.parseFloat(v)/100);setCamera({width:r.width,height:r.height,scale:s,dx:(r.width-mirrorScene.width*s)*(Number.isFinite(p[0])?p[0]:.5),dy:(r.height-mirrorScene.height*s)*(Number.isFinite(p[1])?p[1]:.5),drawWidth:mirrorScene.width*s,drawHeight:mirrorScene.height*s})};
  read();const observer=new ResizeObserver(read);observer.observe(image);image.addEventListener('load',read);document.fonts.ready.then(read);document.fonts.addEventListener('loadingdone',read);
  return()=>{active=false;observer.disconnect();image.removeEventListener('load',read);document.fonts.removeEventListener('loadingdone',read)};
 },[enabled,owner]);
 return camera;
}
