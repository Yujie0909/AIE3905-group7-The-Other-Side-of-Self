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
import {usePageTransition,TransitionFeedback} from './pageTransition';
import {textTask,generateImage} from './api';
import type {Plan,Analysis,Reflection} from '../shared/contracts';

export default function ExperienceShell(){
 const [furthest,setFurthest]=useState<Page>(1);
 const onReach=setFurthest;
 const [session,setSession]=useState<ExperienceSession>(createSession),[adjust,setAdjust]=useState(false),[adjustment,setAdjustment]=useState(''),[busy,setBusy]=useState(false),[round,setRound]=useState(-1),[sharing,setSharing]=useState(false),[word,setWord]=useState(''),[clarify,setClarify]=useState(false),[clarified,setClarified]=useState(false),[answers,setAnswers]=useState(''),[error,setError]=useState(''),[shareIntent,setShareIntent]=useState(false);
 const operation=useRef<AbortController|null>(null),questions=useRef<string[]>([]);
 const navigation=usePageTransition();
 const live=useRef({session,adjust,adjustment,busy,round,sharing,word,clarify,clarified,furthest});live.current={session,adjust,adjustment,busy,round,sharing,word,clarify,clarified,furthest};
 const page=session.currentPage;
 const topics=session.selectedHabitTopics.slice(0,4),topic=topics[round];
 function patch(p:Partial<ExperienceSession>){if(navigation.locked.current)return;if(navigation.state.phase==='error')navigation.stay();setSession(s=>({...s,...p}))}
 useEffect(()=>()=>{operation.current?.abort();operation.current=null},[]);
 useEffect(()=>{setBusy(false);setError('');return()=>{operation.current?.abort();operation.current=null}},[page]);
 async function run(work:(signal:AbortSignal)=>Promise<void>){if(operation.current||navigation.locked.current)return;const c=new AbortController();operation.current=c;navigation.frameRef.current?.dispatchEvent(new Event('scene-input-submitted'));setBusy(true);setError('');try{await work(c.signal)}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'请求失败，请稍后重试。')}finally{if(operation.current===c){operation.current=null;setBusy(false)}}}
 function edit(data:Partial<ExperienceSession>){if(operation.current){operation.current.abort();operation.current=null;setBusy(false)}setError('');patch(data)}
 const daily=()=>JSON.stringify({topics:session.selectedHabitTopics,answers:session.habitAnswers,text:session.dailyFreeText});
 function enter(target:Page,reset=false,visited=false,data:Partial<ExperienceSession>={}){
  if(navigation.locked.current)return;
  if(reset){operation.current?.abort();operation.current=null;setShareIntent(false);setAnswers('')}
  navigation.request({from:page,to:target,onError:()=>setBusy(false),commit:()=>{
   const previous=live.current;
   if(reset){setFurthest(1);setSession(createSession());setRound(-1);setAdjustment('');setSharing(false);setClarify(false);setClarified(false);setWord('')}
   else{setSession(s=>({...s,...data,currentPage:target}));if(visited){setSharing(false);setClarify(false);setShareIntent(false)}}
   setAdjust(false);setBusy(false);
   return()=>{setSession(previous.session);setAdjust(previous.adjust);setAdjustment(previous.adjustment);setBusy(previous.busy);setRound(previous.round);setSharing(previous.sharing);setWord(previous.word);setClarify(previous.clarify);setClarified(previous.clarified);setFurthest(previous.furthest)};
  }});
 }
 function go(target:Page,reset=false,data:Partial<ExperienceSession>={}){if(canTransition(page,target))enter(target,reset,false,data)}
 function generate(adjusting=false){void run(async signal=>{
  if(!session.idealRawText.trim())return;
  const plan=await textTask('ideal',{ideal:session.idealRawText,confirmed:clarified||adjusting,previousPlan:adjusting?session.idealStructuredData:null,adjustment:adjusting?adjustment:''},signal) as Plan;
  if(signal.aborted)return;
  if(plan.questions.length&&!clarified&&!adjusting){questions.current=plan.questions;setClarify(true);if(page!==2)go(2);return}
  const url=await generateImage(plan.prompt,signal);if(signal.aborted)return;
  const data={idealStructuredData:plan,idealPrompt:plan.prompt,idealWorldSummary:plan.explicitFacts.join('；'),idealImageUrl:url,sceneVariant:session.sceneVariant+1};
  if(page===2)go(3,false,data);else{patch(data);setAdjust(false)}
 })}
 function regenerate(){if(!session.idealPrompt){generate();return}void run(async signal=>{const url=await generateImage(session.idealPrompt,signal);if(!signal.aborted)patch({idealImageUrl:url,sceneVariant:session.sceneVariant+1})})}
 function toggleTopic(t:string){const s=session.selectedHabitTopics;patch({selectedHabitTopics:s.includes(t)?s.filter(v=>v!==t):[...s,t]})}
 function dailyContinue(){if(round<0&&topics.length)setRound(0);else if(round<topics.length-1)setRound(round+1);else void run(async signal=>{const result=await textTask('habits',{ideal:session.idealRawText,daily:daily()},signal) as Analysis;if(!signal.aborted)go(5,false,{changeAnalysis:result})})}
 function reflect(){void run(async signal=>{const result=await textTask('reflection',{ideal:session.idealRawText,daily:daily(),reflection:session.reflectionText},signal) as Reflection;if(!signal.aborted){patch({reflectionResponse:result.response,reflectionKeywords:result.keywords,sharingConsent:false,approvedText:''});setSharing(true)}})}
 const exit=()=>go(1,true);
 useEffect(()=>{onReach(previous=>Math.max(previous,page) as Page)},[page,onReach]);
 function navigateVisited(target:Page){if(busy||target>furthest||target===page)return;enter(target,false,true)}
 const wrap=(content:React.ReactNode)=><><div ref={navigation.frameRef} className="scene-frame" data-navigation-state={navigation.state.phase} data-navigation-target={navigation.state.target} aria-busy={navigation.locked.current} inert={navigation.locked.current} onClickCapture={navigation.guard}><JourneyNavigationContext.Provider value={{furthest,busy,onNavigate:navigateVisited}}>{content}</JourneyNavigationContext.Provider></div><TransitionFeedback navigation={navigation}/>{(busy||error)&&<div className="scene-navigation-status ai-status" role="status">{error||'正在处理，请稍候…'}{busy&&<button onClick={()=>{operation.current?.abort();operation.current=null;setBusy(false)}}>取消</button>}{error&&<><button onClick={()=>setError('')}>关闭</button>{page===2&&<button onClick={()=>go(3)}>保留输入，继续体验</button>}{page===4&&<button onClick={()=>go(5)}>继续旅程</button>}{page===6&&<button onClick={()=>{setShareIntent(false);go(7)}}>继续尾声</button>}</>}</div>}</>;
 if(page===1)return wrap(<Page01Welcome onStart={()=>go(2)}/>);
 if(page===2)return wrap(<Page02Dream voice={<VoiceInput value={session.idealRawText} onChange={v=>edit({idealRawText:v})}/>} value={session.idealRawText} onChange={v=>edit({idealRawText:v})} onSubmit={()=>generate()} disabled={!session.idealRawText.trim()||busy} busy={busy} onExit={exit} clarification={clarify&&<><p>{questions.current.join('\n')}</p><TextInput label="补充你的想法（可选）" value={answers} onChange={setAnswers}/><button onClick={()=>{if(answers.trim())patch({idealRawText:session.idealRawText+'；'+answers});setClarify(false);setClarified(true)}}>按确认的描述继续</button></>}/>);
 if(page===3)return wrap(<Page03Ideal onBack={()=>go(2)} version={session.sceneVariant} imageUrl={session.idealImageUrl} busy={busy} onRegenerate={regenerate} onAdjust={()=>setAdjust(!adjust)} onContinue={()=>go(4)} onExit={exit} adjustment={adjust&&<><TextInput label="补充你的想法" value={adjustment} onChange={setAdjustment} placeholder="让晨光更柔和一些……"/><button className="static-pill" disabled={!adjustment.trim()||busy} onClick={()=>generate(true)}>确认调整 ↗</button><small>将保留未要求改变的场景设定，重新生成图片；不代表精准图像编辑。</small></>}/>);
 if(page===4)return wrap(<Page04Daily topics={Object.keys(habits)} selected={session.selectedHabitTopics} onTopic={toggleTopic} round={round} voice={<VoiceInput value={session.dailyFreeText} onChange={v=>edit({dailyFreeText:v})}/>} value={session.dailyFreeText} onChange={v=>edit({dailyFreeText:v})} onContinue={dailyContinue} onSkip={()=>go(5)} onExit={exit} question={<><span className="field-caption">{String(round+2).padStart(2,'0')} / {topic}</span><div className="chips">{(habits[topic]||[]).map(a=><button key={a} aria-pressed={session.habitAnswers[topic]?.includes(a)||false} onClick={()=>{const previous=session.habitAnswers[topic]||[];patch({habitAnswers:{...session.habitAnswers,[topic]:previous.includes(a)?previous.filter(v=>v!==a):[...previous,a]}})}}>{a}</button>)}</div><div className="inline-actions"><button onClick={()=>setRound(round-1)}>返回修改</button>{round<topics.length-1&&<button onClick={()=>setRound(round+1)}>下一项</button>}</div>{session.selectedHabitTopics.length>4&&<small>按选择顺序细聊前四项，其余可通过文字补充。</small>}</>}/>);
 if(page===5)return wrap(<Page05Evolution analysis={session.changeAnalysis?[(session.changeAnalysis as Analysis).summary,...(session.changeAnalysis as Analysis).possibleDifferences,...(session.changeAnalysis as Analysis).uncertainties].join("\n"):undefined} onContinue={()=>go(6)} onExit={exit}/>);
 if(page===6)return wrap(<Page06Reflection voice={<VoiceInput value={session.reflectionText} onChange={v=>edit({reflectionText:v})}/>} value={session.reflectionText} onChange={v=>edit({reflectionText:v})} onSubmit={reflect} sharing={sharing} onSkip={()=>{setShareIntent(false);go(7,false,{sharingConsent:false,approvedText:''})}} onExit={exit} consent={<><p>{session.reflectionResponse}</p><small>进入尾声后会展示待分享词语；此处不会上传任何内容。</small><div className="inline-actions"><button onClick={()=>setSharing(false)}>返回编辑</button><button onClick={()=>{setShareIntent(false);go(7)}}>仅留给自己</button><button onClick={()=>{setShareIntent(true);go(7)}}>愿意分享</button></div></>}/>);
 return wrap(<Page07Voices suggestions={session.reflectionKeywords} input={{ideal:session.idealRawText,daily:daily(),reflection:session.reflectionText}} shareIntent={shareIntent} onShared={words=>patch({sharingConsent:true,approvedText:words.join("、")})} selected={word} onSelect={setWord} onFinish={exit} onExit={exit} approved={session.sharingConsent?session.approvedText:''}/>);
}
