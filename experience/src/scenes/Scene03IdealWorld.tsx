import {cover,type ScenePainter} from './types';
import {illumination,mist} from '../components/AtmosphericEffects';
export const Scene03IdealWorld:ScenePainter=f=>{cover(f,1.022+Math.sin(f.t*.039)*.012,Math.sin(f.t*.081)*f.w*.002);mist(f,.13,.55);illumination(f,.65+Math.sin(f.t*.053)*.12+(f.variant%3)*.015,.33,.10+(f.variant%3)*.012+Math.sin(f.t*.43)*.025,.46)};
