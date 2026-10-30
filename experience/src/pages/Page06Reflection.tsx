import type {ReactNode} from 'react';
import {StaticLayout,StaticArrow,StaticWave} from './StaticLayout';
export function Page06Reflection({voice,value,onChange,onSubmit,onSkip,sharing,consent,onExit}:{voice:ReactNode;value:string;onChange:(v:string)=>void;onSubmit:()=>void;onSkip:()=>void;sharing:boolean;consent:ReactNode;onExit:()=>void}){
 return <StaticLayout page={6} title="与自我重逢" body={<><p>走过想象与现实之间的距离，</p><p>此刻，你有什么想对自己说的吗？</p></>} onExit={onExit}>
  <div className="reflection-static-message">不必等到一切如愿，<br/><span>此刻的你，</span><br/>已经走在属于自己的路上。</div>
  {!sharing?<><div className="reflection-static-voice"><div className="static-voice"><StaticWave/>{voice}<StaticWave/></div><span className="static-mic-caption">点击开始说话</span></div><div className="reflection-static-entry static-entry"><textarea aria-label="留一句话给此刻的自己" maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} placeholder="或者在这里输入…"/><button onClick={onSubmit} disabled={!value.trim()} aria-label="收好此刻的心声"><StaticArrow/></button></div><button className="reflection-static-skip static-note" onClick={onSkip}>跳过 / 仅留给自己</button></>:<div className="reflection-static-consent">{consent}</div>}
 </StaticLayout>
}
