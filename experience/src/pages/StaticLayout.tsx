import type {ReactNode} from 'react';
import type {Page} from '../session';
import './static-pages.css';
import {ReferenceArtwork} from './ReferenceArtwork';
import {JourneyAxis} from './JourneyAxis';
import {useSceneBackground} from '../backgroundLoading';
import {BackgroundFallback} from './BackgroundFallback';
export function StaticLayout({page,title,body,children,onExit,zoomed=false}:{page:Page;title:string;body:ReactNode;children:ReactNode;onExit:()=>void;zoomed?:boolean}){
 const background=useSceneBackground(page);
 return <main ref={background.rootRef} data-background-ready={background.ready} data-background-error={background.error||undefined} className={`static-stage static-page-${String(page).padStart(2,'0')} ${zoomed?'static-close':''}`} data-static-page={page}>
  {background.previous&&<BackgroundFallback frame={background.previous}/>}
  <img ref={background.plateRef} decoding="async" className="static-environment" src={background.source.plate} alt="" aria-hidden="true" draggable={false} fetchPriority="high"/>
  {background.wide&&<ReferenceArtwork page={page}/>}
  <div className="static-mobile-shade" aria-hidden="true"/>
  <h1 className="static-title" aria-label={title.replace(/\n/g,'')}>{title}</h1>
  <div className="static-copy">{body}</div>
  {children}
  <button className="static-exit" onClick={onExit}>退出体验 ↗</button>
  <JourneyAxis page={page} className="static-progress"/>
 </main>
}
export function StaticArrow(){return <svg aria-hidden="true" viewBox="0 0 36 24" fill="none"><path d="M1 12H32M23 3L32 12L23 21" stroke="currentColor" strokeWidth="1.1"/></svg>}
export function StaticWave(){return <span className="static-wave" aria-hidden="true">{[2,5,9,15,22,12,31,42,25,12,21,34,17,7,12,3].map((h,i)=><i key={i} style={{height:`${h}px`}}/>)}</span>}
