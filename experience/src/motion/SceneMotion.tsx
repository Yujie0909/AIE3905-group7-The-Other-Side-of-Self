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
  {page===3&&<>
   <ellipse data-dream-loop="breath" data-period="14300" cx="1098" cy="475" rx="210" ry="190" fill={`url(#${id}-gold)`}/>
   <ellipse data-dream-loop="breath" data-period="18100" cx="1400" cy="450" rx="50" ry="280" fill={`url(#${id}-gold)`}/>
   <g data-dream-loop="leaves" data-period="15700" fill={`url(#${id}-shadow)`}>{[[330,570,95,19],[410,610,80,16],[500,642,65,12],[1310,635,110,19],[1380,655,84,13]].map(([cx,cy,rx,ry],i)=><ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${-21+i*5} ${cx} ${cy})`}/>)}</g>
  </>}
  {page===4&&<>
   <ellipse data-dream-loop="curtainlight" data-period="11700" cx="872" cy="295" rx="125" ry="310" fill={`url(#${id}-gold)`}/>
   <ellipse data-dream-loop="breath" data-period="16900" cx="1395" cy="450" rx="150" ry="230" fill={`url(#${id}-gold)`}/>
  </>}
  {page===5&&<>
   <ellipse data-dream-loop="distant" data-period="17300" cx="1031" cy="413" rx="8" ry="70" fill={`url(#${id}-gold)`}/>
   <ellipse data-dream-loop="distant" data-period="21700" cx="1103" cy="440" rx="7" ry="48" fill={`url(#${id}-gold)`}/>
   <ellipse data-dream-loop="breath" data-period="15300" cx="1218" cy="520" rx="70" ry="45" fill={`url(#${id}-gold)`}/>
  </>}
  </svg>
  {page===5&&<canvas className="dream-cloud" data-local-surface="cloud"/>}
  {page===4&&<canvas className="dream-curtain" data-local-surface="curtain"/>}
  <canvas className="dream-water" data-local-surface="water"/>
 </div>
}
