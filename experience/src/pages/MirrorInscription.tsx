import {useId,useLayoutEffect,useRef,useState} from 'react';
import './mirror-inscription.css';
import {mirrorScene,useMirrorCamera} from './mirror-layout';

export const mirrorLines=['不必等到一切如愿，','此刻的你，','已经走在属于自己的路上。'] as const;
// Quiet blue glass on approved background/page06.png, between the gold seam
// and the right foliage. Artwork coordinates, never fixed viewport positions.
const glass={left:1105,right:1325,top:230,bottom:485};
const slope=.018,preferredFontSize=18;
type Bounds={left:number;right:number;top:number;bottom:number};
type Layout={x:number;y:number;fontSize:number;gap:number;safe:Bounds;lines:{text:string;bounds:Bounds}[];stageHeight:number};

/** One SVG inscription in the same cover camera as the existing background. */
export function MirrorInscription(){
 const host=useRef<HTMLDivElement>(null),copy=useRef<SVGGElement>(null),camera=useMirrorCamera(host);
 const [layout,setLayout]=useState<Layout|null>(null);
 const id=useId().replace(/:/g,'');
 useLayoutEffect(()=>{
  if(!camera||!host.current||!copy.current)return;
  const stage=host.current.closest('main')!,r=stage.getBoundingClientRect(),s=camera.scale;
  const area=camera.width<1024?{left:1100,right:1390,top:230,bottom:520}:glass;
  const safe:Bounds={left:Math.max(12,camera.dx+area.left*s),right:Math.min(camera.width-12,camera.dx+area.right*s),top:Math.max(12,camera.dy+area.top*s),bottom:Math.min(camera.height-12,camera.dy+area.bottom*s)};
  if(camera.width<=700){
   const body=stage.querySelector('.static-copy')?.getBoundingClientRect(),voice=stage.querySelector('.reflection-static-voice')?.getBoundingClientRect();
   // The new mobile layout keeps its controls BELOW the artwork viewport.
   if(body&&body.top<r.top+camera.height)safe.top=Math.max(safe.top,body.bottom-r.top+28);
   if(voice&&voice.top<r.top+camera.height)safe.bottom=Math.min(safe.bottom,voice.top-r.top-28);
  }
  if(safe.right-safe.left<=20||safe.bottom-safe.top<=12){setLayout(null);return}
  const elements=[...copy.current.querySelectorAll<SVGTextElement>('text')];
  const measured=elements.map(e=>({box:e.getBBox(),fontSize:Number.parseFloat(getComputedStyle(e).fontSize),length:e.getComputedTextLength(),baseline:Number(e.getAttribute('y'))}));
  const widthAt18=Math.max(...measured.map(m=>m.length*preferredFontSize/m.fontSize));
  let fontSize=Math.min(camera.width<1024?Math.max(preferredFontSize,14/s):preferredFontSize,(safe.right-safe.left-20)/s/widthAt18*preferredFontSize);
  const nativeBounds=(size:number)=>measured.map((m,i)=>{const k=size/m.fontSize,gap=size*1.95;return {left:m.box.x*k,right:(m.box.x+m.box.width)*k,top:(m.box.y-m.baseline)*k+i*gap+slope*(m.box.x+m.box.width)*k,bottom:(m.box.y-m.baseline+m.box.height)*k+i*gap+slope*m.box.x*k}});
  let bounds=nativeBounds(fontSize),localTop=Math.min(...bounds.map(b=>b.top)),localBottom=Math.max(...bounds.map(b=>b.bottom));
  if((localBottom-localTop)*s>safe.bottom-safe.top-8){fontSize*=(safe.bottom-safe.top-8)/((localBottom-localTop)*s);bounds=nativeBounds(fontSize);localTop=Math.min(...bounds.map(b=>b.top));localBottom=Math.max(...bounds.map(b=>b.bottom))}
  const x=(safe.left-camera.dx)/s+10/s;
  const minimumY=(safe.top-camera.dy)/s-localTop,maximumY=(safe.bottom-camera.dy)/s-localBottom;
  const y=Math.max(minimumY,Math.min(268,maximumY));
  setLayout({x,y,fontSize,gap:fontSize*1.95,safe,stageHeight:camera.height,lines:bounds.map((b,i)=>({text:mirrorLines[i],bounds:{left:camera.dx+(x+b.left)*s,right:camera.dx+(x+b.right)*s,top:camera.dy+(y+b.top)*s,bottom:camera.dy+(y+b.bottom)*s}}))});
 },[camera]);
 return <div ref={host} className="reflection-static-message mirror-inscription" role="img" aria-label={mirrorLines.join('\n')} data-geometry={layout?JSON.stringify(layout):undefined} data-mirror-ready={Boolean(camera&&layout)}>
  <svg className="mirror-inscription-scene" viewBox={`0 0 ${mirrorScene.width} ${mirrorScene.height}`} aria-hidden="true" style={camera?{left:camera.dx,top:camera.dy,width:camera.drawWidth,height:camera.drawHeight}:{visibility:'hidden'}}>
   <defs><linearGradient id={id+'-ink'} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="235" y2="85"><stop stopColor="#4e6079"/><stop offset=".48" stopColor="#4b5d74"/><stop offset="1" stopColor="#716677"/></linearGradient></defs>
   <g ref={copy} className="mirror-inscription-copy" fill={`url(#${id}-ink)`} transform={layout?`matrix(1 ${slope} 0 1 ${layout.x} ${layout.y})`:undefined} style={{fontSize:layout?.fontSize??preferredFontSize,visibility:layout?'visible':'hidden'}}>
    {mirrorLines.map((line,i)=><text className="mirror-inscription-line" key={line} x="0" y={i*(layout?.gap??preferredFontSize*1.95)}>{Array.from(line).map((character,index)=><tspan key={index} data-character={character}>{character}</tspan>)}</text>)}
   </g>
  </svg>
 </div>;
}
