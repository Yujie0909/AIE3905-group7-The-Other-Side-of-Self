import type {CSSProperties} from 'react';
import './page07-copy.css';
import {useSharedCloud,SharingDialog} from './SharedCloud';
import {StaticLayout,StaticArrow} from './StaticLayout';
export function Page07Voices({selected,onSelect,onFinish,approved,onExit,suggestions=[],input={ideal:"",daily:"",reflection:""},shareIntent=false,onShared}:{selected:string;onSelect:(v:string)=>void;onFinish:()=>void;approved:string;onExit:()=>void;suggestions?:string[];input?:{ideal:string;daily:string;reflection:string};shareIntent?:boolean;onShared?:(words:string[])=>void}){const cloud=useSharedCloud();const words=cloud.words.map((w,i)=>{const columns=3,row=Math.floor(i/columns),column=i%columns;return [w.word,55+column*17,15+row*8,Math.min(4.5,1.6+Math.log2(w.frequency+1)*.6)] as const});return <StaticLayout page={7} title="你不是孤身一人" body={<><p>原来，也有人怀着与你相似的心情。</p><p>这些词语，来自其他参与者留下的真实心声。</p></>} onExit={onExit}>
 <p className="voices-static-ending">不同的人生，相同的感受。<br/>你不是孤身一人。<br/>你并不孤单。</p>
 <div className="voices-static-cloud" aria-label="参与者确认分享的词语">{words.map(([word,x,y,size])=><button key={word} className={selected===word?'selected':''} style={{left:`${x}%`,top:`${y}%`,fontSize:`clamp(14px,${Math.min(size,2.3)}vw,${Math.min(size,2.3)*19.2}px)`,'--cloud-x':x,'--cloud-y':y,'--cloud-size':size} as CSSProperties} onClick={()=>onSelect(selected===word?'':word)}><span className="dream-keyword-text">{word}</span></button>)}</div>
 <div className="voices-static-note static-note cloud-toolbar"><span role="status">{selected?selected:approved?'已分享：'+approved:cloud.notice}</span><SharingDialog suggestions={suggestions} input={input} autoOpen={shareIntent} onShared={words=>{onShared?.(words);cloud.refresh()}}/></div>
 <button className="voices-static-finish static-pill" onClick={onFinish}>带着此刻的自己，继续前行<StaticArrow/></button>
 </StaticLayout>}
