import type {ReactNode} from 'react';
import {StaticLayout,StaticArrow,StaticWave} from './StaticLayout';
export function Page06Reflection({voice,value,onChange,onSubmit,onSkip,sharing,consent,onExit}:{voice:ReactNode;value:string;onChange:(v:string)=>void;onSubmit:()=>void;onSkip:()=>void;sharing:boolean;consent:ReactNode;onExit:()=>void}){
 return <StaticLayout page={6} title="再次与自己相遇" body={<p>经历这一段旅程后，<br/>你现在有什么新的感受<br/>或者想对自己说的话？</p>} onExit={onExit}>
  <div className="reflection-static-message">不必等到一切都实现，<br/><span>此刻的你，</span><br/>已经走在属于自己的路上。</div>
  {!sharing?<><div className="reflection-static-voice"><div className="static-voice"><StaticWave/>{voice}<StaticWave/></div><span className="static-mic-caption">点击开始说话</span></div><div className="reflection-static-entry static-entry"><textarea aria-label="留一句话给此刻的自己" maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} placeholder="或者在这里输入…"/><button onClick={onSubmit} disabled={!value.trim()} aria-label="收好此刻的心声"><StaticArrow/></button></div><button className="reflection-static-skip static-note" onClick={onSkip}>跳过 / 仅留给自己</button></>:<div className="reflection-static-consent">{consent}</div>}
 </StaticLayout>
}
