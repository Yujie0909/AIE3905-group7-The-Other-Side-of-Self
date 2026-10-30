import type {Page} from '../session';
import type {Camera} from './SceneMotion';
type Region={x:number;y:number;w:number;h:number;sun:number;strength:number};
export const waters:Record<Page,Region>={
 1:{x:180,y:575,w:1450,h:360,sun:1095,strength:1},2:{x:380,y:615,w:1290,h:320,sun:1200,strength:.75},3:{x:820,y:605,w:790,h:230,sun:1085,strength:.65},4:{x:240,y:675,w:1400,h:260,sun:1390,strength:.65},5:{x:900,y:790,w:740,h:145,sun:1220,strength:.85},6:{x:790,y:620,w:850,h:310,sun:1110,strength:.5},7:{x:200,y:705,w:1450,h:225,sun:1165,strength:.5}
};
export function startDreamscape(host:HTMLDivElement,page:Page,camera:Camera,image:HTMLImageElement){
 const stage=host.closest<HTMLElement>('main')!,frame=stage.closest<HTMLElement>('.scene-frame')!,media=matchMedia('(prefers-reduced-motion: reduce)'),water=host.querySelector<HTMLCanvasElement>('.dream-water')!,ctx=water.getContext('2d',{alpha:true});
 const device=navigator as Navigator&{deviceMemory?:number;connection?:{saveData?:boolean}};
 let quiet=media.matches,visible=true,running=false,raf=0,last=0,time=0,previous=0,draws=0,total=0,max=0,samples=0,quality=innerWidth<=700||navigator.hardwareConcurrency<=4||(device.deviceMemory??8)<=4||device.connection?.saveData?'economy':'full';
 const r=waters[page],ratio=Math.min(1,(quality==='full'?900:500)/r.w);
 water.width=Math.round(r.w*ratio);water.height=Math.round(r.h*ratio);Object.assign(water.style,{left:`${r.x/1672*100}%`,top:`${r.y/941*100}%`,width:`${r.w/1672*100}%`,height:`${r.h/941*100}%`});
 const loops:{animation:Animation;node:Element;voice:boolean}[]=[];
 const loop=(node:Element,frames:Keyframe[],duration:number,delay=0,voice=false)=>{const animation=node.animate(frames,{duration,iterations:Infinity,easing:node.getAttribute('data-dream-loop')==='stream'?'linear':'ease-in-out',delay});animation.pause();animation.currentTime=0;loops.push({animation,node,voice})};
 for(const node of host.querySelectorAll<HTMLElement>('[data-dream-loop]')){
  const kind=node.dataset.dreamLoop,period=Number(node.dataset.period)||12000;
  if(kind==='breath')loop(node,[{opacity:.18},{opacity:.68,offset:.41},{opacity:.35,offset:.77},{opacity:.18}],period);
  if(kind==='stream')loop(node,[{strokeDashoffset:0,opacity:.58},{strokeDashoffset:-665,opacity:.58}],period);
  if(kind==='mist')loop(node,[{transform:'translate(-25px, 1px)',opacity:.3},{transform:'translate(18px,-5px)',opacity:.75,offset:.46},{transform:'translate(-25px,1px)',opacity:.3}],period);
 }
 for(const mic of stage.querySelectorAll('.mic'))loop(mic,[{boxShadow:'none'},{boxShadow:'0 0 24px 6px rgba(239,210,166,.24)'},{boxShadow:'none'}],4100,0,true);
 function draw(t:number){
  if(!ctx)return;const start=performance.now(),w=water.width,h=water.height;ctx.clearRect(0,0,w,h);
  // Only the water is sampled. Furniture, architecture and HTML never deform.
  const strip=quality==='full'?3:5;ctx.globalAlpha=.52;
  for(let y=0;y<h;y+=strip){const py=y/ratio,depth=py/r.h;const shift=(Math.sin(py*.055+t*.82)+.45*Math.sin(py*.12-t*.53))*r.strength*(.4+depth*1.8);ctx.drawImage(image,r.x+3+shift,r.y+py,r.w-6,Math.min(strip/ratio,r.h-py),0,y,w,Math.min(strip,h-y))}
  ctx.globalAlpha=1;
  for(let i=0;i<18;i++){const v=i/18,py=14+v*(h-22),cx=(r.sun-r.x)*ratio+Math.sin(i*1.94+t*.62)*(.6+v)*15*ratio,len=(10+v*74)*(1+.18*Math.sin(i+t*.7))*ratio;const a=(.035+.06*Math.pow(Math.sin(t*.49+i*1.71),2))*r.strength;const g=ctx.createLinearGradient(cx-len,0,cx+len,0);g.addColorStop(0,'rgba(255,220,163,0)');g.addColorStop(.5,`rgba(255,225,172,${a})`);g.addColorStop(1,'rgba(255,220,163,0)');ctx.fillStyle=g;ctx.fillRect(cx-len,py+Math.sin(t*.7+i)*1.2,len*2,Math.max(.6,ratio))}
  const duration=performance.now()-start;draws++;total+=duration;max=Math.max(max,duration);
 }
 function tick(now:number){if(!running)return;const dt=previous?Math.min(now-previous,80):0;previous=now;time+=dt/1000;if(now-last>=(quality==='full'?1000/60:1000/24)-1){draw(time);last=now}samples++;if(samples%120===0){if(total/draws>6&&quality==='full')quality='economy';host.dataset.motionStats=JSON.stringify({draws,meanDrawMs:total/draws,maxDrawMs:max,quality,seconds:time});}raf=requestAnimationFrame(tick)}
 function sync(){quiet=media.matches;const active=!quiet&&!document.hidden&&visible&&stage.dataset.backgroundReady==='true'&&frame?.dataset.navigationState==='idle';host.dataset.motionState=quiet?'reduced':active?'running':'paused';stage.dataset.motionEnabled=String(!quiet);host.style.visibility=quiet?'hidden':'visible';for(const item of loops){const play=active&&(!item.voice||item.node.classList.contains('listening'));if(play)item.animation.play();else{item.animation.pause();if(item.voice&&!item.node.classList.contains('listening'))item.animation.currentTime=0}}if(active&&!running){running=true;previous=0;raf=requestAnimationFrame(tick)}else if(!active&&running){running=false;cancelAnimationFrame(raf);previous=0}}
 draw(0);host.dataset.motionReady='true';
 const observer=new MutationObserver(sync);observer.observe(frame??stage,{attributes:true,subtree:true,attributeFilter:['data-navigation-state','data-background-ready','class']});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()});intersection.observe(stage);document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);sync();
 return()=>{running=false;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);loops.forEach(l=>l.animation.cancel());water.width=0;water.height=0;host.dataset.motionReady='false';delete stage.dataset.motionEnabled};
}
