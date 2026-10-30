import {useEffect,useRef,useState} from 'react';
import {createSession,canTransition,habits,type ExperienceSession,type Page} from './session';
import {VoiceInput,TextInput} from './components';
import {Page01Welcome} from './pages/Page01Welcome';
import {Page02Dream} from './pages/Page02Dream';
import {Page03Ideal} from './pages/Page03Ideal';
import {Page04Daily} from './pages/Page04Daily';
import {Page05Evolution} from './pages/Page05Evolution';
import {Page06Reflection} from './pages/Page06Reflection';
import {Page07Voices} from './pages/Page07Voices';
import {JourneyNavigationContext} from './pages/JourneyAxis';

export default function ExperienceShell(){
 const [furthest,setFurthest]=useState<Page>(1);
 const onReach=setFurthest;
 const [session,setSession]=useState<ExperienceSession>(createSession),[adjust,setAdjust]=useState(false),[adjustment,setAdjustment]=useState(''),[busy,setBusy]=useState(false),[round,setRound]=useState(-1),[sharing,setSharing]=useState(false),[word,setWord]=useState(''),[clarify,setClarify]=useState(false),[clarified,setClarified]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),page=session.currentPage;
 const topics=session.selectedHabitTopics.slice(0,4),topic=topics[round];
 function patch(p:Partial<ExperienceSession>){setSession(s=>({...s,...p}))}
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 function go(target:Page,reset=false){if(!canTransition(page,target))return;if(reset){if(timer.current)clearTimeout(timer.current);setSession(createSession());setRound(-1);setAdjustment('');setSharing(false);setClarify(false);setClarified(false);setWord('')}else patch({currentPage:target});setAdjust(false);setBusy(false)}
 function generate(){if(!session.idealRawText.trim()||busy)return;if(session.idealRawText.trim().length<12&&!clarified){setClarify(true);return}setBusy(true);timer.current=setTimeout(()=>{patch({idealStructuredData:{mode:'mock',explicit_facts:[session.idealRawText],uncertainties:['尚未接入真实文本分析服务']},idealPrompt:'first-person point of view, quiet architectural space, warm ivory and charcoal palette, no human figure',idealWorldSummary:session.idealRawText,idealImageUrl:import.meta.env.BASE_URL+'scenes/page03-reference-clean.jpg',sceneVariant:session.sceneVariant+1});go(3)},700)}
 function toggleTopic(t:string){const s=session.selectedHabitTopics;patch({selectedHabitTopics:s.includes(t)?s.filter(v=>v!==t):[...s,t]})}
 function dailyContinue(){if(round<0&&topics.length)setRound(0);else if(round<topics.length-1)setRound(round+1);else{patch({changeAnalysis:{mode:'mock',change_type:'neutral',daily_summary:session.dailyFreeText,uncertainties:['静态示例不推断习惯与目标的关系']}});go(5)}}
 function reflect(){patch({reflectionKeywords:['自由','慢慢来','热爱','平静','探索'].filter(w=>session.reflectionText.includes(w)).slice(0,5),approvedText:session.reflectionText,sharingConsent:false});setSharing(true)}
 const exit=()=>{onReach(1);go(1,true)};
 useEffect(()=>{onReach(previous=>Math.max(previous,page) as Page)},[page,onReach]);
 function navigateVisited(target:Page){if(busy||target>furthest||target===page)return;patch({currentPage:target});setAdjust(false);setSharing(false);setClarify(false)}
 const wrap=(content:React.ReactNode)=><JourneyNavigationContext.Provider value={{furthest,busy,onNavigate:navigateVisited}}>{content}</JourneyNavigationContext.Provider>;
 if(page===1)return wrap(<Page01Welcome onStart={()=>patch({currentPage:2})}/>);
 if(page===2)return wrap(<Page02Dream voice={<VoiceInput onText={v=>patch({idealRawText:session.idealRawText+v})}/>} value={session.idealRawText} onChange={v=>patch({idealRawText:v})} onSubmit={generate} disabled={!session.idealRawText.trim()||busy} busy={busy} onExit={exit} clarification={clarify&&<><p>如果拥有了更多可能，你最期待生活中发生什么变化？</p><div className="chips">{['拥有更多自由时间','去体验向往的生活','更好地照顾重要的人','其他想法'].map(t=><button key={t} onClick={()=>{patch({idealRawText:session.idealRawText+'，'+t});setClarify(false);setClarified(true)}}>{t}</button>)}</div><button onClick={()=>{setClarify(false);setClarified(true)}}>按原描述继续</button></>}/>);
 if(page===3)return wrap(<Page03Ideal onBack={()=>go(2)} version={session.sceneVariant} onRegenerate={()=>patch({sceneVariant:session.sceneVariant+1})} onAdjust={()=>setAdjust(!adjust)} onContinue={()=>go(4)} onExit={exit} adjustment={adjust&&<><TextInput label="补充你的想法" value={adjustment} onChange={setAdjustment} placeholder="让晨光更柔和一些……"/><button className="static-pill" disabled={!adjustment.trim()} onClick={()=>{patch({idealWorldSummary:session.idealRawText+'；'+adjustment,idealPrompt:session.idealPrompt+'; '+adjustment,sceneVariant:session.sceneVariant+1});setAdjust(false)}}>确认调整 ↗</button><small>当前为静态示例，仅保留调整描述，尚未接入个性化图像生成。</small></>}/>);
 if(page===4)return wrap(<Page04Daily topics={Object.keys(habits)} selected={session.selectedHabitTopics} onTopic={toggleTopic} round={round} voice={<VoiceInput onText={v=>patch({dailyFreeText:session.dailyFreeText+v})}/>} value={session.dailyFreeText} onChange={v=>patch({dailyFreeText:v})} onContinue={dailyContinue} onSkip={()=>go(5)} onExit={exit} question={<><span className="field-caption">{String(round+2).padStart(2,'0')} / {topic}</span><div className="chips">{(habits[topic]||[]).map(a=><button key={a} aria-pressed={session.habitAnswers[topic]?.includes(a)||false} onClick={()=>{const previous=session.habitAnswers[topic]||[];patch({habitAnswers:{...session.habitAnswers,[topic]:previous.includes(a)?previous.filter(v=>v!==a):[...previous,a]}})}}>{a}</button>)}</div><div className="inline-actions"><button onClick={()=>setRound(round-1)}>返回修改</button>{round<topics.length-1&&<button onClick={()=>setRound(round+1)}>下一项</button>}</div>{session.selectedHabitTopics.length>4&&<small>按选择顺序细聊前四项，其余可通过文字补充。</small>}</>}/>);
 if(page===5)return wrap(<Page05Evolution onContinue={()=>go(6)} onExit={exit}/>);
 if(page===6)return wrap(<Page06Reflection voice={<VoiceInput onText={v=>patch({reflectionText:session.reflectionText+v})}/>} value={session.reflectionText} onChange={v=>patch({reflectionText:v})} onSubmit={reflect} sharing={sharing} onSkip={()=>{patch({sharingConsent:false,approvedText:''});go(7)}} onExit={exit} consent={<><p>愿意匿名分享其中的一句话，让其他人也看见吗？</p><TextInput label="请确认实际分享的文字（仅本次演示展示）" value={session.approvedText} onChange={v=>patch({approvedText:v})}/><small>本阶段没有共享数据库，不会真实公开内容。</small><div className="inline-actions"><button onClick={()=>setSharing(false)}>返回编辑</button><button onClick={()=>{patch({sharingConsent:false,approvedText:''});go(7)}}>仅留给自己</button><button disabled={!session.approvedText.trim()} onClick={()=>{patch({sharingConsent:true});go(7)}}>愿意分享</button></div></>}/>);
 return wrap(<Page07Voices selected={word} onSelect={setWord} onFinish={exit} onExit={exit} approved={session.sharingConsent?session.approvedText:''}/>);
}
