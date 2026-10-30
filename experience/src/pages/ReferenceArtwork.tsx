import {useId} from 'react';
import type {Page} from '../session';
import {backgroundAssets} from '../backgroundAssets';
// Keep original artwork pixels outside repaired UI regions. The clean plates were
// produced with image inpainting; these static masks prevent baked-in UI ghosts.
type Box=[number,number,number,number];
const boxes:Partial<Record<Page,Box[]>>={
 2:[[60,45,240,70],[65,130,735,175],[65,315,580,95],[620,515,430,205],[480,713,715,95],[75,820,1545,85]],
 3:[[65,40,240,75],[65,130,540,195],[825,675,775,100],[65,820,1490,80]],
 4:[[60,45,240,70],[60,130,650,195],[75,350,770,290],[1010,520,460,220],[235,735,1205,105],[65,850,1545,65]],
 5:[[60,45,245,70],[65,130,690,230],[70,685,1035,100],[65,805,1535,90]],
 6:[[50,40,245,75],[50,130,535,255],[85,445,510,205],[60,650,675,105],[1245,185,320,225],[55,815,1525,85]],
 7:[[65,55,245,75],[65,145,550,335],[1160,715,445,100],[65,820,1540,80],
 [1090,65,150,80],[985,145,110,80],[1180,155,165,75],[800,195,115,80],[1410,210,120,80],[1280,245,120,85],[1480,295,125,85],[815,290,160,80],[1050,285,175,115],[1310,355,205,90],[800,385,110,80],[955,405,185,85],[1200,410,120,85],[840,470,110,80],[975,485,115,80],[1125,510,120,80],[1280,505,155,80],[1465,465,120,80]]
};
/** A continuous static alpha feather: the old UI area is completely cut
 * out; only its surrounding scenery blends. No blur of artwork or text, and no
 * large offscreen Gaussian-filter surface on repaint. */
function RepairHole({box,id}:{box:Box;id:string}){
 const [x,y,width,height]=box,f=64;
 return <g transform={`translate(${x} ${y})`} fill="black">
  <rect width={width} height={height}/>
  <rect y={-f} width={width} height={f} fill={`url(#${id}-down)`}/>
  <rect y={height} width={width} height={f} fill={`url(#${id}-up)`}/>
  <rect x={-f} width={f} height={height} fill={`url(#${id}-right)`}/>
  <rect x={width} width={f} height={height} fill={`url(#${id}-left)`}/>
  <rect x={-f} y={-f} width={f} height={f} fill={`url(#${id}-tl)`}/>
  <rect x={width} y={-f} width={f} height={f} fill={`url(#${id}-tr)`}/>
  <rect x={-f} y={height} width={f} height={f} fill={`url(#${id}-bl)`}/>
  <rect x={width} y={height} width={f} height={f} fill={`url(#${id}-br)`}/>
 </g>
}
const featherStops=[[0,1],[.2,.96],[.4,.68],[.6,.32],[.8,.04],[1,0]] as const;
export function ReferenceArtwork({page}:{page:Page}){
 const id=useId().replace(/:/g,'');
 const localBoxes=boxes[page]??[];
 // Other control and mirror repairs keep their existing geometry/filter.
 const isTypographyRepair=(index:number)=>index===1||(page===2&&index===2)||(page===7&&index>=4);
 const stops=featherStops.map(([offset,alpha])=><stop key={offset} offset={offset} stopColor="black" stopOpacity={alpha}/>);
 return <svg className="static-artwork" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
  <linearGradient id={id+'-down'} x1="0" y1="1" x2="0" y2="0">{stops}</linearGradient>
  <linearGradient id={id+'-up'} x1="0" y1="0" x2="0" y2="1">{stops}</linearGradient>
  <linearGradient id={id+'-right'} x1="1" y1="0" x2="0" y2="0">{stops}</linearGradient>
  <linearGradient id={id+'-left'} x1="0" y1="0" x2="1" y2="0">{stops}</linearGradient>
  {([['tl',1,1],['tr',0,1],['bl',1,0],['br',0,0]] as const).map(([corner,cx,cy])=><radialGradient key={corner} id={id+'-'+corner} cx={cx} cy={cy} r="1">{stops}</radialGradient>)}
  <filter id={id+'-legacy-feather'}><feGaussianBlur stdDeviation="4"/></filter>
  <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><rect width="1672" height="941" fill="white"/><g fill="black" filter={`url(#${id}-legacy-feather)`}>{localBoxes.map(([x,y,width,height],i)=>!isTypographyRepair(i)&&<rect key={i} x={x} y={y} width={width} height={height} rx="5"/>)}</g>{localBoxes.map((box,i)=>isTypographyRepair(i)&&<RepairHole key={i} box={box} id={id}/>)}</mask>
 </defs><image href={backgroundAssets[page].artwork} width="1672" height="941" preserveAspectRatio="none" mask={`url(#${id})`}/></svg>
}
