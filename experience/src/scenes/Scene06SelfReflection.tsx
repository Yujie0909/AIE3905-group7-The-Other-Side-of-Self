import {cover,type ScenePainter} from './types';
import {illumination,mist} from '../components/AtmosphericEffects';
export const Scene06SelfReflection:ScenePainter=f=>{cover(f,1.01);const {ctx:c,w,h,t}=f;
 c.save();c.beginPath();c.roundRect(w*.52,h*.10,w*.41,h*.68,w*.025);c.clip();
 const x=w*(.57+Math.sin(t*.13)*.13),g=c.createLinearGradient(x-w*.08,0,x+w*.08,0);g.addColorStop(0,'#e9e2d500');g.addColorStop(.5,'#e9e2d52b');g.addColorStop(1,'#e9e2d500');c.fillStyle=g;c.transform(1,.09,.15,1,0,0);c.fillRect(w*.4,0,w*.6,h);c.restore();
 illumination(f,.75,.43,.11+Math.sin(t*.51)*.045+Math.sin(t*.121)*.02,.38);mist(f,.13,.69);
};
