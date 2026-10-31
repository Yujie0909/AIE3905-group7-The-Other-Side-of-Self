import {useEffect,useRef,type FocusEvent} from 'react';

/** Only listen while a phone/tablet text field owns the keyboard. No polling,
 * React state updates, window resize listeners or idle animation loop. */
export function useInputViewport(){
 const dispose=useRef<()=>void>(()=>{});
 useEffect(()=>()=>dispose.current(),[]);
 function onFocusCapture(event:FocusEvent<HTMLDivElement>){
  if(!(event.target instanceof HTMLTextAreaElement)||!matchMedia('(max-width:1023px)').matches||!window.visualViewport)return;
  dispose.current();
  const host=event.currentTarget,viewport=window.visualViewport;
  let raf=0,active=true,lastHeight=-1;
  const typing=()=>document.activeElement instanceof HTMLTextAreaElement&&host.contains(document.activeElement);
  const stop=()=>{active=false;cancelAnimationFrame(raf);viewport.removeEventListener('resize',schedule);viewport.removeEventListener('scroll',schedule);host.style.removeProperty('--input-viewport-height');host.style.removeProperty('--input-viewport-center');if(dispose.current===stop)dispose.current=()=>{}};
  function update(){
   raf=0;if(!active)return;
   if(!typing()&&viewport.height>=window.innerHeight*.92){stop();return}
   host.style.setProperty('--input-viewport-height',`${viewport.height}px`);
   host.style.setProperty('--input-viewport-center',`${viewport.offsetTop+viewport.height/2}px`);
   if(typing()&&Math.abs(viewport.height-lastHeight)>1){
    const input=document.activeElement as HTMLTextAreaElement,r=input.getBoundingClientRect();
    if(r.bottom>viewport.offsetTop+viewport.height-24||r.top<viewport.offsetTop+24)input.scrollIntoView({block:'center',behavior:'instant'});
   }
   lastHeight=viewport.height;
  }
  function schedule(){if(active&&!raf)raf=requestAnimationFrame(update)}
  dispose.current=stop;viewport.addEventListener('resize',schedule);viewport.addEventListener('scroll',schedule);schedule();
 }
 function onBlurCapture(){if(!window.visualViewport||window.visualViewport.height>=window.innerHeight*.92)dispose.current()}
 return {onFocusCapture,onBlurCapture};
}
