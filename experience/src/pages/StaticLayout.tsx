import type {ReactNode} from 'react';
import type {Page} from '../session';
import './static-pages.css';
import {ReferenceArtwork} from './ReferenceArtwork';
export function StaticLayout({page,title,body,children,onExit,zoomed=false}:{page:Page;title:string;body:ReactNode;children:ReactNode;onExit:()=>void;zoomed?:boolean}){
 return <main className={`static-stage static-page-${String(page).padStart(2,'0')} ${zoomed?'static-close':''}`} data-static-page={page}>
  <img className="static-environment" src={import.meta.env.BASE_URL+`scenes/page${String(page).padStart(2,'0')}-reference-clean.jpg`} alt="" aria-hidden="true" draggable={false} fetchPriority="high"/>
  <ReferenceArtwork page={page}/>
  <div className="static-mobile-shade" aria-hidden="true"/>
  <div className="static-counter" aria-label={`第 ${page} 幕，共 7 幕`}><span>{String(page).padStart(2,'0')}</span><b>/</b><small>07</small><i aria-hidden="true"/></div>
  <h1 className="static-title" aria-label={title.replace(/\n/g,'')}>{title}</h1>
  <div className="static-copy">{body}</div>
  {children}
  <button className="static-exit" onClick={onExit}>退出体验 ↗</button>
  <ol className="static-progress" aria-label={`旅程进度，第 ${page} 幕，共 7 幕`}>{Array.from({length:7},(_,i)=><li key={i} aria-current={i+1===page?'step':undefined}><i/><span>{String(i+1).padStart(2,'0')}</span></li>)}</ol>
 </main>
}
export function StaticArrow(){return <svg aria-hidden="true" viewBox="0 0 36 24" fill="none"><path d="M1 12H32M23 3L32 12L23 21" stroke="currentColor" strokeWidth="1.1"/></svg>}
export function StaticWave(){return <span className="static-wave" aria-hidden="true">{[2,5,9,15,22,12,31,42,25,12,21,34,17,7,12,3].map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}</span>}
