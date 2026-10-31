import {useId,useLayoutEffect,useRef} from 'react';
import type {createPage02Material} from './page02-material';
import './page02-environment.css';

// Traced anew against approved background/page02.png, not the retired artwork.
const routes=[
 {period:10.2,phase:.08,d:'M1690 47 C1480 55 1370 80 1260 219 C1165 329 1100 407 969 424 C867 446 802 403 739 331 C677 260 595 242 510 257 C441 268 392 286 345 301'},
 {period:11.7,phase:.46,d:'M1580 -30 C1430 34 1331 105 1240 226 C1142 355 1064 404 940 393 C822 384 733 340 627 322 C559 310 501 322 441 340'},
 {period:9.1,phase:.73,d:'M1690 152 C1561 130 1488 106 1412 122 C1304 145 1234 223 1166 321 C1094 426 1008 457 902 447 C838 440 805 424 771 402'},
];

/** One owned loop and one shared decoded texture. No React state per frame. */
export function Page02Environment(){
 const maskId=useId().replace(/:/g,'');
 const owner=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),svg=useRef<SVGSVGElement>(null);
 useLayoutEffect(()=>{
  const host=owner.current!,surface=canvas.current!,ribbon=svg.current!;
  const main=host.closest('main')!,image=main.querySelector<HTMLImageElement>(':scope>.static-environment')!;
  const frame=main.closest<HTMLElement>('.scene-frame')!,media=matchMedia('(prefers-reduced-motion:reduce)');
  let material:ReturnType<typeof createPage02Material>=null,raf=0,last=0,elapsed=0,frames=0,disposed=false;
  let enabled=true,inView=true,scheduled=false,attempted=false,prepareFrame=0,paintFrame=0,idle=0;
  let fallbackTimer:ReturnType<typeof setTimeout>|undefined;
  host.dataset.material='pending';
  const segments=[...ribbon.querySelectorAll<SVGPathElement>('[data-stream]')];
  // Small composited highlights avoid repainting full-screen SVG strokes in
  // Safari. SVG paths remain the geometry source and the compatibility fallback.
  const lights:{node:HTMLDivElement;route:number;animation:Animation}[]=[];
  if(CSS.supports('offset-path','path("M0 0L1 1")')){
   segments.forEach(s=>s.style.display='none');
   routes.forEach((route,i)=>{for(let phase=0;phase<2;phase++){
    const node=document.createElement('div');node.className='page02-ribbon-highlight';host.append(node);
    const animation=node.animate([{offsetDistance:'0%',opacity:0},{offsetDistance:'7%',opacity:1,offset:.07},{offsetDistance:'80%',opacity:1,offset:.8},{offsetDistance:'100%',opacity:0}],{duration:route.period*1000,iterations:Infinity,delay:-(route.phase+phase*.5)*route.period*1000,easing:'linear'});
    animation.pause();lights.push({node,route:i,animation});
   }});
  }
  function resize(){
   const r=image.getBoundingClientRect(),fit=getComputedStyle(image),contain=fit.objectFit==='contain';
   const scale=(contain?Math.min:Math.max)(r.width/1672,r.height/941);
   const [px,py]=fit.objectPosition.split(' ').map(x=>parseFloat(x)/100);
   const dw=1672*scale,dh=941*scale,dx=(r.width-dw)*(Number.isFinite(px)?px:.5),dy=(r.height-dh)*(Number.isFinite(py)?py:.5);
   Object.assign(ribbon.style,{left:`${dx}px`,top:`${dy}px`,width:`${dw}px`,height:`${dh}px`});
   for(const light of lights){let axis=0;const path=routes[light.route].d.replace(/[A-Za-z]|[-+]?(?:\d*\.)?\d+/g,token=>{if(/[A-Za-z]/.test(token)){axis=0;return token}return String(Number(token)*scale+(axis++%2===0?dx:dy))});Object.assign(light.node.style,{offsetPath:`path("${path}")`,width:`${180*scale}px`,height:`${24*scale}px`})}
   material?.resize(r.width,r.height,dw,dh,dx,dy);host.dataset.camera=JSON.stringify({width:r.width,height:r.height,scale,dx,dy});
  }
  const visible=()=>enabled&&inView&&!disposed&&!document.hidden&&!media.matches&&frame.dataset.navigationState==='idle'&&main.dataset.backgroundReady==='true';
  function prepareMaterial(){
   if(scheduled||attempted||material||!visible())return;
   scheduled=true;
   // Let the decoded scene actually paint before downloading/compiling shaders.
   // This readiness is deliberately NOT a condition for committing navigation.
   prepareFrame=requestAnimationFrame(()=>{paintFrame=requestAnimationFrame(()=>{
    performance.mark('page02:static-presented');
    const initialize=()=>{
     idle=0;
     if(!visible()){scheduled=false;return}
     import('./page02-material').then(module=>{
      scheduled=false;if(!visible())return;attempted=true;
      performance.mark('page02:material-init-start');
      try{material=module.createPage02Material(surface,image)}catch{material=null}
      if(material){resize();surface.style.visibility='visible';host.dataset.material='webgl'}
      else{surface.style.visibility='hidden';host.dataset.material='unavailable'}
      performance.mark('page02:material-init-end');
     }).catch(()=>{scheduled=false;attempted=true;host.dataset.material='unavailable'});
    };
    if('requestIdleCallback'in window)idle=window.requestIdleCallback(initialize,{timeout:1000});
    else fallbackTimer=setTimeout(initialize,0);
   })});
  }
  function tick(now:number){
   raf=0;if(!visible())return;
   if(last){material?.adapt(now-last);elapsed+=now-last}last=now;
   const t=elapsed/1000,sky=host.dataset.sky!=='off',water=host.dataset.water!=='off',mist=host.dataset.mist!=='off';
   material?.draw(t,[Number(sky),Number(water),Number(mist)]);
   ribbon.style.visibility=host.dataset.ribbon==='off'?'hidden':'visible';
   for(const light of lights)light.node.style.visibility=host.dataset.ribbon==='off'?'hidden':'visible';
   if(!lights.length)for(const segment of segments){const route=routes[Number(segment.dataset.route)],tail=Number(segment.dataset.tail);segment.setAttribute('stroke-dashoffset',String(-1000*(t/route.period+route.phase)+tail*23))}
   frames++;host.dataset.frames=String(frames);host.dataset.time=t.toFixed(3);
   raf=requestAnimationFrame(tick);
  }
  function sync(){
   const run=visible();host.dataset.running=String(run);host.dataset.suppressed=String(!enabled||document.hidden||media.matches);last=0;
   lights.forEach(light=>run?light.animation.play():light.animation.pause());
   if(run)prepareMaterial();
   if(run&&!raf)raf=requestAnimationFrame(tick);
   if(!run&&raf){cancelAnimationFrame(raf);raf=0}
  }
  const observer=new ResizeObserver(resize);observer.observe(image);
  const intersection=new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;sync()});intersection.observe(host);
  const stateObserver=new MutationObserver(sync);stateObserver.observe(frame,{attributes:true,attributeFilter:['data-navigation-state']});
  const onControl=()=>{enabled=host.dataset.enabled!=='off';sync()};
  const controlObserver=new MutationObserver(onControl);controlObserver.observe(host,{attributes:true,attributeFilter:['data-enabled']});
  function lost(event:Event){event.preventDefault();material?.dispose();material=null;surface.style.visibility='hidden';host.dataset.material='lost'}
  function restored(){attempted=false;host.dataset.material='pending';sync()}
  surface.addEventListener('webglcontextlost',lost);surface.addEventListener('webglcontextrestored',restored);
  document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);
  resize();sync();
  return()=>{disposed=true;cancelAnimationFrame(raf);cancelAnimationFrame(prepareFrame);cancelAnimationFrame(paintFrame);if(idle)window.cancelIdleCallback(idle);if(fallbackTimer)clearTimeout(fallbackTimer);lights.forEach(light=>{light.animation.cancel();light.node.remove()});observer.disconnect();intersection.disconnect();stateObserver.disconnect();controlObserver.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);surface.removeEventListener('webglcontextlost',lost);surface.removeEventListener('webglcontextrestored',restored);material?.dispose()};
 },[]);
 return <div ref={owner} className="page02-environment" data-running="false" data-suppressed="true" aria-hidden="true">
  <canvas ref={canvas} data-environment-layers="sky mist water reflection"/>
  <svg ref={svg} viewBox="0 0 1672 941" fill="none" data-environment-layer="ribbon">
   <defs><linearGradient id={maskId} gradientUnits="userSpaceOnUse" x1="345" y1="0" x2="950" y2="0"><stop stopColor="#fff1ce" stopOpacity="0"/><stop offset=".45" stopColor="#fff1ce" stopOpacity=".2"/><stop offset="1" stopColor="#fff1ce"/></linearGradient></defs>
   {routes.map((route,i)=><g key={route.d} strokeLinecap="round">
    <path d={route.d} stroke={`url(#${maskId})`} strokeWidth="2" opacity=".09"/>
    {[0,1,2].map(tail=><path key={tail} data-stream="true" data-route={i} data-tail={tail} d={route.d} pathLength="1000" strokeDasharray={`${56+tail*9} ${944-tail*9}`} stroke={`url(#${maskId})`} strokeWidth={[2,8,20][tail]} opacity={[.64,.18,.045][tail]}/>) }
   </g>)}
  </svg>
 </div>;
}
