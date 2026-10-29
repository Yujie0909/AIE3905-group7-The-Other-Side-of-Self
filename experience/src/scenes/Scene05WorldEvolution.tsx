import type {ScenePainter} from './types';
import {Scene03IdealWorld} from './Scene03IdealWorld';
import {illumination,mist} from '../components/AtmosphericEffects';
export const Scene05WorldEvolution:ScenePainter=f=>{Scene03IdealWorld(f);const {ctx:c,w,h,playback,t}=f;c.fillStyle=`rgba(169,135,89,${playback*.11})`;c.fillRect(0,0,w,h);mist(f,.12+playback*.08,.59);illumination(f,.84-Math.sin(t*.063)*.10,.52,.08+playback*.10,.45)};
