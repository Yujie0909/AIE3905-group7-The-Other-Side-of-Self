import {useId,useLayoutEffect,useRef,useState} from 'react';
import type {Page} from '../session';
import {getPreparedImage} from '../sceneResources';
import {backgroundAssets} from '../backgroundAssets';
import {startDreamscape} from './runtime';
import './dreamscape.css';
export type Camera={left:number;top:number;width:number;height:number;scale:number};
export function SceneMotion({page,ready}:{page:Page;ready:boolean}){
 const host=useRef<HTMLDivElement>(null),[camera,setCamera]=useState<Camera|null>(null),id=useId().replace(/:/g,'');
 useLayoutEffect(()=>{const stage=host.current?.closest('main'),image=stage?.querySelector<HTMLImageElement>(':scope > img');if(!stage||!image)return;const read=()=>{const r=image.getBoundingClientRect(),s=stage.getBoundingClientRect(),scale=Math.max(r.width/1672,r.height/941),pos=getComputedStyle(image).objectPosition.split(' ').map(parseFloat);setCamera({left:r.left-s.left+(r.width-1672*scale)*(pos[0]/100),top:r.top-s.top+(r.height-941*scale)*(pos[1]/100),width:1672*scale,height:941*scale,scale})};read();const ro=new ResizeObserver(read);ro.observe(image);const mo=new MutationObserver(read);mo.observe(stage,{attributes:true,attributeFilter:['class']});image.addEventListener('load',read);return()=>{ro.disconnect();mo.disconnect();image.removeEventListener('load',read)}},[]);
 useLayoutEffect(()=>{if(!camera||!host.current||!ready)return;const image=getPreparedImage(backgroundAssets[page].plate);if(!image)return;return startDreamscape(host.current,page,camera,image)},[camera,ready,page]);
 return <div ref={host} className="dreamscape" data-scene-motion={page} data-motion-ready="false" aria-hidden="true" style={camera?{left:camera.left,top:camera.top,width:camera.width,height:camera.height}:undefined}>
  <svg className="dream-atmosphere" viewBox="0 0 1672 941"><defs>
   <radialGradient id={id+'-gold'}><stop stopColor="#ffe0a1" stopOpacity=".58"/><stop offset=".4" stopColor="#edbc70" stopOpacity=".18"/><stop offset="1" stopColor="#eabb76" stopOpacity="0"/></radialGradient>
   <radialGradient id={id+'-mist'}><stop stopColor="#efe6d7" stopOpacity=".31"/><stop offset=".4" stopColor="#dedde0" stopOpacity=".12"/><stop offset="1" stopColor="#d5e0e7" stopOpacity="0"/></radialGradient>
   <radialGradient id={id+'-shadow'}><stop stopColor="#172025" stopOpacity=".24"/><stop offset="1" stopColor="#172025" stopOpacity="0"/></radialGradient>
   <linearGradient id={id+'-thread'}><stop stopColor="#f8cf91" stopOpacity="0"/><stop offset=".5" stopColor="#ffe4b0" stopOpacity=".9"/><stop offset="1" stopColor="#f8cf91" stopOpacity="0"/></linearGradient>
  </defs>
  {page===1&&<>
   <ellipse data-dream-loop="breath" data-period="11300" cx="1100" cy="300" rx="160" ry="365" fill={`url(#${id}-gold)`}/>
   <g data-dream-loop="mist" data-period="19700"><ellipse cx="1040" cy="545" rx="380" ry="42" fill={`url(#${id}-mist)`}/><ellipse cx="1300" cy="582" rx="275" ry="30" fill={`url(#${id}-mist)`}/></g>
  </>}
  {page===2&&<g fill="none" stroke={`url(#${id}-thread)`} strokeLinecap="round">
   <path data-dream-loop="stream" data-period="13700" d="M650 345 C835 462 1006 476 1115 335 S1215 80 1500 2" strokeWidth="3.4" strokeDasharray="85 580"/>
   <path data-dream-loop="stream" data-period="16700" d="M830 424 C1030 488 1085 245 1255 260 S1500 371 1680 295" strokeWidth="2.2" strokeDasharray="65 600"/>
   <path data-dream-loop="stream" data-period="11300" d="M1125 300 C1330 165 1495 115 1705 135" strokeWidth="1.5" strokeDasharray="45 620"/>
  </g>}
  </svg>
  <canvas className="dream-water" data-local-surface="water"/>
 </div>
}
