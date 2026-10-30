import './page01.css';
import {JourneyAxis} from './JourneyAxis';

interface Page01WelcomeProps {onStart:()=>void}

/** Static reconstruction of references/page 01.png. No scene renderer or animation clock. */
export function Page01Welcome({onStart}:Page01WelcomeProps){
 return <main className="page01-stage" aria-label="自我的彼岸 — The Other Side of Self">
  <img className="page01-environment" src={import.meta.env.BASE_URL+'scenes/page01-reference-clean.jpg'} alt="" aria-hidden="true" fetchPriority="high" draggable={false}/>
  <div className="page01-mobile-shade" aria-hidden="true"/>
  <h1 className="page01-title" aria-label="欢迎进入心流空间">欢迎进入<br/>心流空间</h1>
  <p className="page01-subtitle" lang="en">The Other Side of Self</p>
  <div className="page01-copy">
   <p>在这里，暂时放下外界的评价，倾听内心的声音。</p>
   <p>这是一场没有标准答案的旅程，也是一段只属于你的故事。</p>
  </div>
  <button type="button" className="page01-start" onClick={onStart} aria-describedby="page01-privacy"><span>开始体验</span><svg aria-hidden="true" viewBox="0 0 36 24" fill="none"><path d="M1 12H32M23 3L32 12L23 21" stroke="currentColor" strokeWidth="1.15"/></svg></button>
  <p id="page01-privacy" className="page01-sr-only">当前为演示模式，输入仅保留在本次会话中。你可以随时退出。语音只在主动点击麦克风后请求权限，可能使用浏览器在线识别服务。</p>
  <JourneyAxis page={1} className="page01-progress"/>
 </main>
}
