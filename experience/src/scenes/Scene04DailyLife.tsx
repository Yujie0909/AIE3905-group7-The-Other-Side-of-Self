import {cover,type ScenePainter} from './types';
import {illumination} from '../components/AtmosphericEffects';
export const Scene04DailyLife:ScenePainter=f=>{cover(f,1.015);const {ctx:c,w,h,t}=f;
 // Move only the curtain fabric; the wall and floor remain geometrically stable.
 if(f.image){c.save();c.beginPath();c.rect(w*.44,0,w*.56,h*.86);c.clip();
  // One affine fabric layer: sway and slight stretch, no per-column resampling.
  const sway=Math.sin(t*.39)*w*.0035+Math.sin(t*.171)*w*.0012;
  c.translate(w*.68+sway,h*.25);c.transform(1+Math.sin(t*.23)*.004,0,Math.sin(t*.31)*.006,1,0,0);c.translate(-w*.68,-h*.25);cover(f,1.015);c.restore()}

 illumination(f,.76+Math.sin(t*.109)*.065,.28,.14+Math.sin(t*.37)*.04,.48);
 // Slow window-shadow sweep across the same floor.
 c.save();c.globalAlpha=.055;c.fillStyle='#242a30';c.beginPath();c.moveTo(w*.60+Math.sin(t*.084)*w*.025,h*.20);c.lineTo(w*.64,h*.20);c.lineTo(w*.40,h);c.lineTo(w*.31,h);c.closePath();c.fill();c.restore();
};
