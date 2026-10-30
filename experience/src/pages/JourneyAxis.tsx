import {createContext,useContext} from 'react';
import type {Page} from '../session';

export const journeyLabels=['开始','想象','理想','现状','变化','自我','尾声'] as const;
export const JourneyNavigationContext=createContext<{furthest:Page;busy:boolean;onNavigate:(page:Page)=>void}>({furthest:1,busy:false,onNavigate:()=>{}});

/** Revisit reached chapters without skipping required input or discarding session data. */
export function JourneyAxis({page,className}:{page:Page;className:string}){
 const navigation=useContext(JourneyNavigationContext);
 return <ol className={className} aria-label={`旅程进度，第 ${page} 幕，共 7 幕`}>
  {journeyLabels.map((label,index)=>{const step=(index+1) as Page;return <li key={step} aria-current={step===page?'step':undefined}>
   <button type="button" className="journey-step" aria-label={`${String(step).padStart(2,'0')} ${label}`} aria-current={step===page?'step':undefined} disabled={navigation.busy||step>navigation.furthest} onClick={()=>navigation.onNavigate(step)}>
    <i className="journey-dot" aria-hidden="true"/><span className="journey-step-label">{String(step).padStart(2,'0')} {label}</span>
   </button>
  </li>})}
 </ol>
}
