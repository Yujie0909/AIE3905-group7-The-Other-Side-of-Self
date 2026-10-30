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
 const curtain=host.querySelector<HTMLCanvasElement>('.dream-curtain'),cloth=curtain?.getContext('2d'),mask=document.createElement('canvas');
 if(curtain){curtain.width=330;curtain.height=410;Object.assign(curtain.style,{left:`${560/1672*100}%`,top:'0',width:`${500/1672*100}%`,height:`${620/941*100}%`});mask.width=330;mask.height=410;const m=mask.getContext('2d')!;m.scale(.66,410/620);m.translate(-560,0);m.filter='blur(3px)';m.fillStyle='rgba(255,255,255,.65)';m.fill(new Path2D('M665 0 L1040 0 C1005 166 986 305 907 433 C879 459 818 447 786 456 C755 474 744 539 795 588 C751 610 673 601 635 571 C568 530 569 454 602 370 C660 230 648 113 665 0 Z'))}
 const cloud=host.querySelector<HTMLCanvasElement>('.dream-cloud'),sky=cloud?.getContext('2d');if(cloud){cloud.width=500;cloud.height=141;Object.assign(cloud.style,{left:`${780/1672*100}%`,top:`${190/941*100}%`,width:`${550/1672*100}%`,height:`${155/941*100}%`})}
 const loops:{animation:Animation;node:Element;voice:boolean}[]=[];
 const loop=(node:Element,frames:Keyframe[],duration:number,delay=0,voice=false)=>{const animation=node.animate(frames,{duration,iterations:Infinity,easing:node.getAttribute('data-dream-loop')==='stream'?'linear':'ease-in-out',delay});animation.pause();animation.currentTime=0;loops.push({animation,node,voice})};
 for(const node of host.querySelectorAll<HTMLElement>('[data-dream-loop]')){
  const kind=node.dataset.dreamLoop,period=Number(node.dataset.period)||12000;
  if(kind==='breath')loop(node,[{opacity:.18},{opacity:.68,offset:.41},{opacity:.35,offset:.77},{opacity:.18}],period);
  if(kind==='star')loop(node,[{opacity:.12},{opacity:.65,offset:.35},{opacity:.28,offset:.72},{opacity:.12}],period);
  if(kind==='reflection')loop(node,[{opacity:.10,transform:'translate(0px,12px)'},{opacity:.27,transform:'translate(3px,-14px)',offset:.54},{opacity:.10,transform:'translate(0px,12px)'}],period);
  if(kind==='distant')loop(node,[{opacity:.06},{opacity:.22,offset:.58},{opacity:.06}],period);
  if(kind==='curtainlight')loop(node,[{opacity:.16,transform:'translateX(0px)'},{opacity:.46,transform:'translateX(3px)'},{opacity:.16,transform:'translateX(0px)'}],period);
  if(kind==='leaves')loop(node,[{transform:'translate(0px,0px) rotate(0deg)',opacity:.3},{transform:'translate(4px,-2px) rotate(.16deg)',opacity:.65,offset:.42},{transform:'translate(0px,0px) rotate(0deg)',opacity:.3}],period);
  if(kind==='stream')loop(node,[{strokeDashoffset:0,opacity:.58},{strokeDashoffset:-665,opacity:.58}],period);
  if(kind==='mist')loop(node,[{transform:'translate(-25px, 1px)',opacity:.3},{transform:'translate(18px,-5px)',opacity:.75,offset:.46},{transform:'translate(-25px,1px)',opacity:.3}],period);
 }
 for(const [i,node]of [...stage.querySelectorAll<HTMLElement>('.dream-keyword-text')].entries()){const rect=node.getBoundingClientRect(),box=stage.getBoundingClientRect(),dx=Math.max(0,Math.min(2.2,rect.left-box.left-8,box.right-rect.right-8)),dy=Math.max(0,Math.min(3.5,rect.top-box.top-8,box.bottom-rect.bottom-8)),sign=i%2?1:-1;loop(node,[{translate:'0px 0px'},{translate:`${sign*dx}px ${-sign*dy}px`,offset:.31},{translate:`${-sign*dx*.5}px ${sign*dy*.6}px`,offset:.68},{translate:'0px 0px'}],9700+(i*2713%7900),i*73)}
 for(const mic of stage.querySelectorAll('.mic'))loop(mic,[{boxShadow:'none'},{boxShadow:'0 0 24px 6px rgba(239,210,166,.24)'},{boxShadow:'none'}],4100,0,true);
 function draw(t:number){
  if(!ctx)return;const start=performance.now(),w=water.width,h=water.height;ctx.clearRect(0,0,w,h);
  // Only the water is sampled. Furniture, architecture and HTML never deform.
  const strip=quality==='full'?3:5;ctx.globalAlpha=.52;
  for(let y=0;y<h;y+=strip){const py=y/ratio,depth=py/r.h;const shift=(Math.sin(py*.055+t*.82)+.45*Math.sin(py*.12-t*.53))*r.strength*(.4+depth*1.8);ctx.drawImage(image,r.x+3+shift,r.y+py,r.w-6,Math.min(strip/ratio,r.h-py),0,y,w,Math.min(strip,h-y))}
  ctx.globalAlpha=1;
  for(let i=0;i<18;i++){const v=i/18,py=14+v*(h-22),cx=(r.sun-r.x)*ratio+Math.sin(i*1.94+t*.62)*(.6+v)*15*ratio,len=(10+v*74)*(1+.18*Math.sin(i+t*.7))*ratio;const a=(.035+.06*Math.pow(Math.sin(t*.49+i*1.71),2))*r.strength;const g=ctx.createLinearGradient(cx-len,0,cx+len,0);g.addColorStop(0,'rgba(255,220,163,0)');g.addColorStop(.5,`rgba(255,225,172,${a})`);g.addColorStop(1,'rgba(255,220,163,0)');ctx.fillStyle=g;ctx.fillRect(cx-len,py+Math.sin(t*.7+i)*1.2,len*2,Math.max(.6,ratio))}
  if(curtain&&cloth){const w=curtain.width,h=curtain.height;cloth.clearRect(0,0,w,h);cloth.globalCompositeOperation='source-over';for(let y=0;y<h;y+=4){const py=y/h*620,bend=Math.pow(py/620,1.4)*(Math.sin(t*.54+py*.004)*3+.6*Math.sin(t*.93+py*.009));cloth.drawImage(image,560+bend,py,500,Math.min(4/h*620,620-py),0,y,w,Math.min(4,h-y))}cloth.globalCompositeOperation='destination-in';cloth.drawImage(mask,0,0);cloth.globalCompositeOperation='source-over'}
  if(cloud&&sky){sky.clearRect(0,0,500,141);sky.globalAlpha=.52;const drift=Math.sin(t*.12)*4+Math.sin(t*.073)*1.8;sky.drawImage(image,780+drift,190+Math.sin(t*.15)*1.2,550,155,0,0,500,141)}
  const duration=performance.now()-start;draws++;total+=duration;max=Math.max(max,duration);
 }
 function tick(now:number){if(!running)return;const dt=previous?Math.min(now-previous,80):0;previous=now;time+=dt/1000;if(now-last>=(quality==='full'?1000/60:1000/24)-1){draw(time);last=now}samples++;if(samples%120===0){if(total/draws>6&&quality==='full')quality='economy';host.dataset.motionStats=JSON.stringify({draws,meanDrawMs:total/draws,maxDrawMs:max,quality,seconds:time});}raf=requestAnimationFrame(tick)}
 function sync(){quiet=media.matches;const active=!quiet&&!document.hidden&&visible&&stage.dataset.backgroundReady==='true'&&frame?.dataset.navigationState==='idle';host.dataset.motionState=quiet?'reduced':active?'running':'paused';stage.dataset.motionEnabled=String(!quiet);host.style.visibility=quiet?'hidden':'visible';for(const item of loops){const play=active&&(!item.voice||item.node.classList.contains('listening'));if(play)item.animation.play();else{item.animation.pause();if(quiet||(item.voice&&!item.node.classList.contains('listening')))item.animation.currentTime=0}}if(active&&!running){running=true;previous=0;raf=requestAnimationFrame(tick)}else if(!active&&running){running=false;cancelAnimationFrame(raf);previous=0}}
 draw(0);host.dataset.motionReady='true';
 const observer=new MutationObserver(sync);observer.observe(frame??stage,{attributes:true,subtree:true,attributeFilter:['data-navigation-state','data-background-ready','class']});
 const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()});intersection.observe(stage);document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);sync();
 return()=>{running=false;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);loops.forEach(l=>l.animation.cancel());water.width=0;water.height=0;if(curtain){curtain.width=0;curtain.height=0}mask.width=0;mask.height=0;if(cloud){cloud.width=0;cloud.height=0}host.dataset.motionReady='false';delete stage.dataset.motionEnabled};
}
