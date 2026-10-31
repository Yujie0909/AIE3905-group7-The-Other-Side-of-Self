import {useEffect,useRef,type ReactNode} from 'react';
import type {Page} from '../session';

/** Empty unless a page opts into motion. Effects have their own readiness and
 * visible/hidden/leave lifecycle, separate from all UI. */
export function MotionLayers({page,ready,children}:{page:Page;ready:boolean;children?:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const host=ref.current!,frame=host.closest('.scene-frame'),media=matchMedia('(prefers-reduced-motion:reduce)');
  const update=()=>{host.dataset.sceneActivity=!ready?'loading':document.hidden?'hidden':media.matches?'reduced':frame?.getAttribute('data-navigation-state')==='idle'?'visible':'transitioning'};
  const observer=new MutationObserver(update);if(frame)observer.observe(frame,{attributes:true,attributeFilter:['data-navigation-state']});
  document.addEventListener('visibilitychange',update);media.addEventListener('change',update);update();
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);media.removeEventListener('change',update);host.dataset.sceneActivity='disposed'};
 },[ready]);
 return <div ref={ref} className="scene-motion-layers" data-scene-motion={page} data-motion-ready={ready} data-motion-state={children?'environment':'static'} aria-hidden="true">{ready&&children}</div>;
}
export function UIOverlay({children}:{children:ReactNode}){return <div className="scene-ui-overlay">{children}</div>}
