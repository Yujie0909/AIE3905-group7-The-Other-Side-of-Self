import {useEffect,useRef} from 'react';
import type {Page} from '../session';
import {sceneRegistry} from '../config/sceneRegistry';
import {easeScene,transitionDuration} from './SceneTransition';
import {cover,type SceneDefinition,type SceneFrame} from '../scenes/types';
import {mist,illumination} from './AtmosphericEffects';
interface Props{page:Page;variant:number;reduced:boolean;playback:number;idealImageUrl?:string|null;changeVideoUrl?:string|null}
export function BackgroundRenderer(props:Props){
 const ref=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{const canvas=ref.current!,c=canvas.getContext('2d',{alpha:false})!;const buffer=document.createElement('canvas'),bc=buffer.getContext('2d')!;
 let video:HTMLVideoElement|null=null,videoSource='',videoReadyAt=-1,videoFailed=false;
 const failedImages=new Set<string>();const images=new Map<string,HTMLImageElement>();let w=0,h=0,raf=0,last=0,time=0,frames=0,hidden=document.hidden,from=sceneRegistry[latest.current.page],to=from,started=-100,previousSignature='';
 const load=(src:string)=>{if(!images.has(src)){const i=new Image();i.crossOrigin='anonymous';i.src=/^(https?:|blob:|data:|\/)/.test(src)?src:import.meta.env.BASE_URL+src;images.set(src,i);i.onload=()=>{previousSignature=''};i.onerror=()=>{failedImages.add(src);previousSignature=''}}return images.get(src)!};
 const source=(d:SceneDefinition,p:Props)=>((d.id==='scene-03-ideal'||d.id==='scene-05-evolution')&&p.idealImageUrl&&!p.idealImageUrl.startsWith('procedural:'))?p.idealImageUrl:d.asset;
 const resolved=(d:SceneDefinition,p:Props)=>failedImages.has(source(d,p))?d.asset:source(d,p);
 const resize=()=>{const scale=Math.min(1,1280/innerWidth);w=canvas.width=buffer.width=Math.round(innerWidth*scale);h=canvas.height=buffer.height=Math.round(innerHeight*scale);previousSignature=''};
 const visibility=()=>{hidden=document.hidden;last=0};resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);
 function paint(ctx:CanvasRenderingContext2D,d:SceneDefinition,p:Props){ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='#151A20';ctx.fillRect(0,0,w,h);const im=load(resolved(d,p));const image=im.complete&&im.naturalWidth?im:null;const f:SceneFrame={ctx,w,h,t:time,image,imageWidth:im.naturalWidth||1,imageHeight:im.naturalHeight||1,playback:p.playback,variant:p.variant,listening:document.documentElement.dataset.listening==='true'};d.paint(f);
 if(d.id==='scene-05-evolution'&&video&&!videoFailed&&video.readyState>=2){if(videoReadyAt<0)videoReadyAt=performance.now();ctx.save();ctx.globalAlpha=easeScene((performance.now()-videoReadyAt)/1200);cover({...f,image:video,imageWidth:video.videoWidth,imageHeight:video.videoHeight});ctx.restore();mist(f,.10,.59);illumination(f,.72,.45,.04+Math.sin(time*.37)*.015)}
 return !!image}
 function render(now:number){raf=requestAnimationFrame(render);if(hidden)return;if(last&&now-last<1000/30-1)return;const dt=last?(now-last)/1000:1/30;last=now;const p=latest.current;if(!p.changeVideoUrl&&video){video.pause();video.removeAttribute('src');video.load();video=null;videoSource='';videoReadyAt=-1}
 if(p.changeVideoUrl&&p.changeVideoUrl!==videoSource){video?.pause();video=document.createElement('video');video.muted=true;video.playsInline=true;video.crossOrigin='anonymous';video.src=p.changeVideoUrl;video.preload='auto';videoSource=p.changeVideoUrl;videoReadyAt=-1;videoFailed=false;video.onerror=()=>{videoFailed=true};video.load()}
 if(video){if(p.page===5&&!p.reduced&&!videoFailed&&video.paused&&!video.ended)void video.play().catch(()=>{videoFailed=true});else if(p.page!==5||p.reduced)video.pause()}
 if(!p.idealImageUrl){for(const [key,im] of images){if(!Object.values(sceneRegistry).some(d=>d.asset===key)){im.onerror=null;im.src='';images.delete(key);failedImages.delete(key)}}}
 const next=sceneRegistry[p.page];if(next!==to){from=to;to=next;started=now;previousSignature=''}
 if(!p.reduced)time+=dt;const signature=[p.page,p.variant,p.reduced,p.playback,p.idealImageUrl,w,h].join('|');if(p.reduced&&signature===previousSignature)return;previousSignature=signature;
 const image=load(resolved(to,p)),progress=p.reduced?1:easeScene((now-started)/transitionDuration);
 let loaded:boolean;if(!image.complete||!image.naturalWidth){loaded=paint(c,from,p);started=now;previousSignature=''}else if(progress<1&&image.complete&&image.naturalWidth){paint(c,from,p);paint(bc,to,p);c.globalAlpha=progress;c.drawImage(buffer,0,0);c.globalAlpha=1;loaded=true}else if(progress<1){loaded=paint(c,from,p);started=now}else{loaded=paint(c,to,p)}
 // Feathered text protection rather than opaque cards; identical UI treatment across scenes.
 const left=c.createLinearGradient(0,0,w*.61,0);left.addColorStop(0,'#111922cf');left.addColorStop(.58,'#1119227a');left.addColorStop(1,'#11192200');c.fillStyle=left;c.fillRect(0,0,w,h);
 if(p.page>1){const g=c.createRadialGradient(w*.76,h*.40,w*.09,w*.76,h*.4,w*.40);g.addColorStop(0,'#10192288');g.addColorStop(.64,'#10192255');g.addColorStop(1,'#10192200');c.fillStyle=g;c.fillRect(0,0,w,h)}
 frames++;canvas.dataset.sceneId=to.id;canvas.dataset.frames=String(frames);canvas.dataset.time=time.toFixed(3);canvas.dataset.loaded=String(loaded);canvas.dataset.transition=String(progress<1||!image.complete||!image.naturalWidth);canvas.dataset.source=resolved(to,p);canvas.dataset.mediaMode=p.page===5&&video&&!videoFailed&&video.readyState>=2?'video':'image';
 }
 load(to.asset);raf=requestAnimationFrame(render);return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);images.forEach(i=>i.src='');if(video){video.pause();video.removeAttribute('src');video.load()}};
 },[]);
 return <div className={`scene scene-${props.page}`} data-scene={sceneRegistry[props.page].id} aria-hidden="true"><canvas ref={ref} className="environment-canvas"/></div>
}
