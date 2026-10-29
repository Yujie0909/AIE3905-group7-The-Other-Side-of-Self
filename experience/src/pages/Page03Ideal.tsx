import {useState,type ReactNode} from 'react';
import {StaticLayout,StaticArrow} from './StaticLayout';
export function Page03Ideal({onRegenerate,onAdjust,onContinue,adjustment,onExit,onBack,version}:{onRegenerate:()=>void;onAdjust:()=>void;onContinue:()=>void;adjustment:ReactNode;onExit:()=>void;onBack:()=>void;version:number}){
 const [zoomed,setZoomed]=useState(false);
 return <StaticLayout zoomed={zoomed} page={3} title="你好，理想的世界" body={<p>基于你的描述，我们为你搭建了<br/>一个属于你的想象空间。</p>} onExit={onExit}>
  <div className="ideal-static-actions"><button className="static-pill" onClick={onRegenerate}><svg aria-hidden="true" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M24 12a10 10 0 1 0-1 8M24 4v8h-8"/></svg>重新生成</button><button className="static-pill" onClick={onAdjust}><svg aria-hidden="true" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 7h24M2 14h24M2 21h24M10 3v8M19 10v8M12 17v8"/></svg>我想调整</button><button className="static-pill" onClick={onContinue}>继续探索<StaticArrow/></button></div>
  <div className="ideal-static-secondary"><button className="static-note" onClick={onBack}>返回描述</button><button className="static-note" onClick={()=>setZoomed(!zoomed)}>{zoomed?'还原视图':'查看细节'}</button></div><span className="ideal-static-note static-note" role="status">静态示例 · 版本 {version} · 尚未接入个性化 AI 生成</span>{adjustment&&<div className="ideal-static-adjustment">{adjustment}</div>}
 </StaticLayout>
}
