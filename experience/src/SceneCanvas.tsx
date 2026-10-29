import {useEffect,useRef} from 'react';
import type {Page} from './session';
import {motionTokens,sceneConfig} from './sceneConfig';
// One canvas, one animation clock. UI updates only change targets, never reset the clock.
export function PersistentSceneCanvas(props:{page:Page;variant:number;reduced:boolean;playback:number}){
 const ref=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const canvas=ref.current!,ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
  const image=new Image();image.src=import.meta.env.BASE_URL+'environment.jpg';
  let width=0,height=0,raf=0,last=0,elapsed=0,frames=0,hidden=document.hidden;
  let pointer={x:0,y:0},position={x:0,y:0};const state={...sceneConfig[latest.current.page]},target={...state};
  // Fixed seeded texture; no random flashing or per-frame texture allocation.
  const fog=document.createElement('canvas');fog.width=192;fog.height=96;
  const fc=fog.getContext('2d')!,pixels=fc.createImageData(192,96);
  for(let y=0;y<96;y++)for(let x=0;x<192;x++){
   const edge=Math.sin(Math.PI*x/192)*Math.sin(Math.PI*y/96);
   const n=(Math.sin(x*.063+Math.cos(y*.09)*2)+Math.sin(x*.12-y*.052)+Math.cos(y*.19+x*.037))/6+.5;
   const i=(y*192+x)*4;pixels.data[i]=210;pixels.data[i+1]=205;pixels.data[i+2]=193;pixels.data[i+3]=Math.max(0,Math.round(n*edge*150));
  }fc.putImageData(pixels,0,0);
  const resize=()=>{width=innerWidth;height=innerHeight;const scale=Math.min(1.25,devicePixelRatio,motionTokens.maxWidth/width);canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale)};
  const move=(e:PointerEvent)=>{pointer={x:e.clientX/width-.5,y:e.clientY/height-.5}};
  const visibility=()=>{hidden=document.hidden;last=0};
  resize();window.addEventListener('resize',resize);window.addEventListener('pointermove',move);document.addEventListener('visibilitychange',visibility);
  function render(now:number){raf=requestAnimationFrame(render);if(hidden)return;if(last&&now-last<1000/motionTokens.fps-1)return;
   const wallDt=last?(now-last)/1000:1/30;const dt=Math.min(wallDt,.1);last=now;const p=latest.current;
   if(!p.reduced)elapsed+=wallDt;
   Object.assign(target,sceneConfig[p.page]);if(p.page===5){target.warmth+=p.playback*.11;target.light-=p.playback*.10}
   const blend=p.reduced?1:1-Math.exp(-dt*2.4);for(const k of Object.keys(state) as (keyof typeof state)[])state[k]+=(target[k]-state[k])*blend;
   position.x+=((p.reduced?0:pointer.x)-position.x)*.035;position.y+=((p.reduced?0:pointer.y)-position.y)*.035;
   const w=canvas.width,h=canvas.height,t=elapsed;
   ctx!.setTransform(1,0,0,1,0,0);ctx!.globalCompositeOperation='source-over';ctx!.globalAlpha=1;
   ctx!.fillStyle='#151A20';ctx!.fillRect(0,0,w,h);
   if(image.complete&&image.naturalWidth){
    const zoom=1.015+state.openness*.012+(p.reduced?0:Math.sin(t*.071)*.002);
    const scale=Math.max(w/image.width,h/image.height)*zoom,iw=image.width*scale,ih=image.height*scale;
    const ix=(w-iw)/2+position.x*6,iy=(h-ih)/2+position.y*4;
    ctx!.drawImage(image,ix,iy,iw,ih);
    // Low-amplitude surface highlights; reflection stays anchored to the same image.
    if(!p.reduced){ctx!.globalAlpha=state.reflection;for(let j=0;j<20;j++){
     const y=h*(.64+j*.017),strip=h*.008,shift=Math.sin(t*.48+j*.62)*w*.0012+Math.sin(t*.217+j)*w*.0006;
     ctx!.drawImage(image,Math.max(0,-ix/scale),Math.max(0,(y-iy)/scale),w/scale,strip/scale,shift,y,w,strip);
    }ctx!.globalAlpha=1}
   }
   // A: Light has an 10.7s breath modulated by an incommensurate slow cycle.
   const breath=p.reduced?0:Math.sin(t*Math.PI*2/motionTokens.breathPeriod)*.025+Math.sin(t*.137)*.012;
   const darkness=Math.max(0,1-state.light*.84-breath);
   ctx!.fillStyle=`rgba(12,18,24,${darkness})`;ctx!.fillRect(0,0,w,h);
   ctx!.globalCompositeOperation='source-over';ctx!.fillStyle=`rgba(214,197,167,${state.warmth*.22+(p.variant%5)*.003})`;ctx!.fillRect(0,0,w,h);
   // D: Natural illumination follows the architectural opening and grazes the floor.
   ctx!.globalCompositeOperation='source-over';
   const glow=ctx!.createRadialGradient(w*.75,h*.45,0,w*.75,h*.45,w*.44);
   glow.addColorStop(0,`rgba(233,226,213,${.035+state.openness*.035+breath})`);glow.addColorStop(1,'rgba(233,226,213,0)');ctx!.fillStyle=glow;ctx!.fillRect(w*.38,0,w*.62,h);
   const sweep=p.reduced?0:Math.sin(t*.091+.5)*w*.045+Math.sin(t*.043)*w*.02;
   ctx!.save();ctx!.beginPath();ctx!.moveTo(w*.725,h*.18);ctx!.lineTo(w*.79,h*.18);ctx!.lineTo(w+sweep,h);ctx!.lineTo(w*.46+sweep,h);ctx!.closePath();ctx!.clip();
   const light=ctx!.createLinearGradient(w*.7,0,w*.65,h);light.addColorStop(0,'#e9e2d500');light.addColorStop(.62,`rgba(233,226,213,${.025+breath*.5})`);light.addColorStop(1,'#e9e2d500');ctx!.fillStyle=light;ctx!.fillRect(0,0,w,h);ctx!.restore();
   // B: Independent drifting fog fields; combined periods do not visibly repeat at 60s.
   ctx!.globalAlpha=state.mist;ctx!.drawImage(fog,w*(.22+Math.sin(t*.036)*.11),h*(.44+Math.sin(t*.047)*.025),w*.95,h*.33);
   ctx!.globalAlpha=state.mist*.67;ctx!.drawImage(fog,w*(-.26+Math.sin(t*.023+2)*.16),h*(.64+Math.sin(t*.039+1)*.018),w*1.2,h*.23);
   ctx!.globalAlpha=1;ctx!.globalCompositeOperation='source-over';
   // Local text shading leaves the main architectural field visible.
   const shade=ctx!.createLinearGradient(0,0,w*.63,0);shade.addColorStop(0,'#151a20c7');shade.addColorStop(.58,'#151a2080');shade.addColorStop(1,'#151a2000');ctx!.fillStyle=shade;ctx!.fillRect(0,0,w,h);
   const legibility=ctx!.createRadialGradient(w*.74,h*.41,w*.11,w*.74,h*.41,w*.40);legibility.addColorStop(0,`rgba(14,21,28,${state.readability})`);legibility.addColorStop(.58,`rgba(14,21,28,${state.readability*.72})`);legibility.addColorStop(1,'rgba(14,21,28,0)');ctx!.fillStyle=legibility;ctx!.fillRect(0,0,w,h);
   frames++;canvas.dataset.frames=String(frames);canvas.dataset.time=t.toFixed(3);canvas.dataset.light=state.light.toFixed(3);canvas.dataset.loaded=String(image.complete&&image.naturalWidth>0);
  }
  raf=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move);document.removeEventListener('visibilitychange',visibility);image.src=''};
 },[]);
 return <div className={`scene scene-${props.page}`} aria-hidden="true"><canvas ref={ref} className="environment-canvas"/></div>
}
