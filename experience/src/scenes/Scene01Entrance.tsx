import type {ScenePainter} from './types';
import {base,illumination,mist,water} from '../components/AtmosphericEffects';
export const Scene01Entrance:ScenePainter=f=>{base(f);water(f,.63,.38);mist(f,.28,.55);const breath=.10+Math.sin(f.t*.59)*.045+Math.sin(f.t*.173)*.018;illumination(f,.69,.43,breath,.35);f.ctx.fillStyle=`rgba(8,18,29,${.12-Math.sin(f.t*.59)*.025})`;f.ctx.fillRect(0,0,f.w,f.h)};
