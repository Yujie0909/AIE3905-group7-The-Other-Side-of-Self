import type {ReactNode} from 'react';
import {StaticLayout,StaticArrow,StaticWave} from './StaticLayout';
export function Page02Dream({voice,value,onChange,onSubmit,disabled,busy,clarification,onExit}:{voice:ReactNode;value:string;onChange:(v:string)=>void;onSubmit:()=>void;disabled:boolean;busy:boolean;clarification:ReactNode;onExit:()=>void}){
 return <StaticLayout page={2} title={'如果一切都可以实现，\n你想要什么样的生活？'} body={<p>抛却现实的限制，<br/>试着描述那个让你感到期待和向往的自己。</p>} onExit={onExit}>
  <div className="dream-capture"><div className="static-voice"><StaticWave/>{voice}<StaticWave/></div><span className="static-mic-caption">点击开始说话</span>
  <div className="static-entry"><textarea aria-label="写下你向往的生活" maxLength={2000} value={value} onChange={e=>onChange(e.target.value)} placeholder="或者在这里输入你的想法…"/><button onClick={onSubmit} disabled={disabled} aria-label="构建我的世界">{busy?'…':<StaticArrow/>}</button></div>{clarification&&<div className="static-clarification">{clarification}</div>}</div>
 </StaticLayout>
}
