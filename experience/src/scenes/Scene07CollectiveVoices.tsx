import {cover,type ScenePainter} from './types';
import {illumination,mist,water} from '../components/AtmosphericEffects';
export const Scene07CollectiveVoices:ScenePainter=f=>{cover(f);water(f,.61,.19);mist(f,.20,.53);illumination(f,.70+Math.sin(f.t*.06)*.12,.59,.10+Math.sin(f.t*.29)*.035,.40)};
