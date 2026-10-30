import {useId,useLayoutEffect,useRef,useState} from 'react';
import './mirror-inscription.css';

export const mirrorLines=['不必等到一切如愿，','此刻的你，','已经走在属于自己的路上。'] as const;

// Four points measured on the existing 1672×941 artwork, inside its right glass
// face. The receding right edge gives a homography, rather than a screen caption.
const corners=[[1290,230],[1513,187],[1509,352],[1287,396]] as const;
function projectGlass(){
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=corners;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
 const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const determinant=dx1*dy2-dx2*dy1;
 const g=(dx3*dy2-dx2*dy3)/determinant,h=(dx1*dy3-dx3*dy1)/determinant;
 const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
 return `matrix3d(${[a/266,d/266,0,g/266,b/166,e/166,0,h/166,0,0,1,0,x0,y0,0,1].join(',')})`;
}
const projection=projectGlass();

/** One editable inscription; no rasterized text, duplicate reflection or card. */
export function MirrorInscription(){
 const host=useRef<HTMLDivElement>(null);
 const [surface,setSurface]=useState<{left:number;top:number;width:number;height:number;sceneWidth:number;sceneHeight:number;offsetX:number;offsetY:number}|null>(null);
 useLayoutEffect(()=>{
  const image=host.current?.closest('main')?.querySelector<HTMLImageElement>('.static-environment');if(!image)return;
  const place=()=>{const r=image.getBoundingClientRect(),scale=Math.max(r.width/1672,r.height/941),positions=getComputedStyle(image).objectPosition.split(' ').map(Number.parseFloat),dx=(r.width-1672*scale)*(positions[0]/100),dy=(r.height-941*scale)*(positions[1]/100);setSurface({left:dx+1260*scale,top:dy+160*scale,width:285*scale,height:270*scale,sceneWidth:1672*scale,sceneHeight:941*scale,offsetX:-1260*scale,offsetY:-160*scale})};
  place();const observer=new ResizeObserver(place);observer.observe(image);return()=>observer.disconnect();
 },[]);
 const id=useId().replace(/:/g,''),base=import.meta.env.BASE_URL+'scenes/page06-reference-clean.jpg';
 return <div ref={host} className="reflection-static-message mirror-inscription" role="img" aria-label={mirrorLines.join('\n')}>
  <div className="mirror-inscription-material" style={surface?{left:surface.left,top:surface.top,width:surface.width,height:surface.height}:{visibility:'hidden'}}>
  <svg className="mirror-inscription-scene" style={surface?{left:surface.offsetX,top:surface.offsetY,width:surface.sceneWidth,height:surface.sceneHeight}:undefined} viewBox="0 0 1672 941" aria-hidden="true">
   <defs>
    <filter id={id+'-luminance'} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="-.34" intercept="1.08"/><feFuncG type="linear" slope="-.34" intercept="1.08"/><feFuncB type="linear" slope="-.34" intercept="1.08"/></feComponentTransfer></filter>
    <mask id={id+'-reflection'} x="0" y="0" width="1672" height="941" maskUnits="userSpaceOnUse" style={{maskType:'luminance'}}><image href={base} width="1672" height="941" filter={`url(#${id}-luminance)`}/></mask>
   </defs>
   <g mask={`url(#${id}-reflection)`}><foreignObject width="1672" height="941"><div className="mirror-inscription-plane" style={{transform:projection}}>{mirrorLines.map(line=><span className="mirror-inscription-line" key={line}>{line}</span>)}</div></foreignObject></g>
  </svg>
  </div>
  <span className="mirror-inscription-narrow" aria-hidden="true">{mirrorLines[0]}<br/><span>{mirrorLines[1]}</span><br/>{mirrorLines[2]}</span>
 </div>;
}
