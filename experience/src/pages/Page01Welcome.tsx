import './page01.css';

interface Page01WelcomeProps {onStart:()=>void}

/** Static reconstruction of references/page 01.png. No scene renderer or animation clock. */
export function Page01Welcome({onStart}:Page01WelcomeProps){
 return <main className="page01-stage" aria-label="自我的彼岸 — The Other Side of Self">
  <img className="page01-environment" src={import.meta.env.BASE_URL+'scenes/page01-reference-clean.jpg'} alt="" aria-hidden="true" fetchPriority="high" draggable={false}/>
  <div className="page01-mobile-shade" aria-hidden="true"/>
  <div className="page01-counter" aria-label="第 1 幕，共 7 幕"><span>01</span><span className="page01-counter-slash">/</span><span className="page01-counter-total">07</span><i aria-hidden="true"/></div>
  <h1 className="page01-title" aria-label="欢迎进入心流空间">欢迎进入<br/>心流空间</h1>
  <p className="page01-subtitle" lang="en">The Other Side of Self</p>
  <div className="page01-copy">
   <p>在这里，你可以暂时放下外界的声音，<br/>与自己相遇。</p>
   <p>这段旅程没有标准答案，<br/>只有关于“你”的独一无二的故事。</p>
  </div>
  <button type="button" className="page01-start" onClick={onStart} aria-describedby="page01-privacy"><span>开始体验</span><svg aria-hidden="true" viewBox="0 0 36 24" fill="none"><path d="M1 12H32M23 3L32 12L23 21" stroke="currentColor" strokeWidth="1.15"/></svg></button>
  <p id="page01-privacy" className="page01-sr-only">当前为演示模式，输入仅保留在本次会话中。你可以随时退出。语音只在主动点击麦克风后请求权限，可能使用浏览器在线识别服务。</p>
  <ol className="page01-progress" aria-label="旅程进度，第 1 幕，共 7 幕">
   {Array.from({length:7},(_,index)=><li key={index} aria-current={index===0?'step':undefined}><span className="page01-progress-dot"/><span className="page01-progress-label">{String(index+1).padStart(2,'0')}</span></li>)}
  </ol>
 </main>
}
