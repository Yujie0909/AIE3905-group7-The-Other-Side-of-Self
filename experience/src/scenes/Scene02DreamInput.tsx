import type {ScenePainter} from './types';
import {base,illumination,mist} from '../components/AtmosphericEffects';
export const Scene02DreamInput:ScenePainter=f=>{
 base(f,1.018);mist(f,.32,.49);
 const {ctx:c,w,h,t}=f;
 // Open horizontal ribbons, independent of the entrance geometry.
 for(let band=0;band<4;band++){
  c.beginPath();for(let x=0;x<=w;x+=8){const y=h*(.47+band*.022)+Math.sin(x/w*5.5-t*.19+band*.7)*h*.032+Math.sin(x/w*9+t*.083)*h*.009;if(x===0)c.moveTo(x,y);else c.lineTo(x,y)}
  c.strokeStyle=`rgba(233,226,213,${.08+band*.012+(f.listening?.08:0)})`;c.lineWidth=band===0?2.3:1.2;c.stroke();
 }
 illumination(f,.63+Math.sin(t*.07)*.12,.46,.10+Math.sin(t*.47)*.03,.55);
};
