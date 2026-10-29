import {useState} from 'react';
import {StaticLayout,StaticArrow} from './StaticLayout';
export function Page05Evolution({onContinue,onExit}:{onContinue:()=>void;onExit:()=>void}){const [paused,setPaused]=useState(true),[position,setPosition]=useState(2);return <StaticLayout page={5} title="当一切趋于完美" body={<p>随着时间的推移，一些细微的变化开始出现。<br/>它不一定是坏事，也许只是另一种可能的视角。</p>} onExit={onExit}>
 <div className="evolution-static-player"><button aria-label={paused?'播放预览':'暂停预览'} aria-pressed={!paused} onClick={()=>setPaused(!paused)}>{paused?<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 4 20 12 8 20Z" fill="currentColor"/></svg>:<span aria-hidden="true">Ⅱ</span>}</button><input type="range" min="0" max="5" step="1" value={position} onChange={e=>setPosition(Number(e.target.value))} aria-label="预览位置"/><time>00:0{position} / 00:05</time></div>
 <span className="evolution-static-note static-note">静态演示 · 动态播放将在 Phase 2 开启</span><button className="evolution-static-next static-pill" onClick={onContinue}>再次与自己相遇<StaticArrow/></button>
 </StaticLayout>}
