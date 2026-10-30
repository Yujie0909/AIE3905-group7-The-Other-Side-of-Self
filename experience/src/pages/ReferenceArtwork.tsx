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
export function ReferenceArtwork({page}:{page:Page}){const id=useId().replace(/:/g,'');return <svg className="static-artwork" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><filter id={id+'-feather'}><feGaussianBlur stdDeviation="4"/></filter><mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><rect width="1672" height="941" fill="white"/><g fill="black" filter={`url(#${id}-feather)`}>{boxes[page]?.map(([x,y,width,height],i)=><rect key={i} x={x} y={y} width={width} height={height} rx="5"/>)}</g></mask></defs><image href={backgroundAssets[page].artwork} width="1672" height="941" preserveAspectRatio="none" mask={`url(#${id})`}/></svg>}
