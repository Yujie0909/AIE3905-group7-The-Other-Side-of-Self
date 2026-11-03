export class ValidationError extends Error{}
export type Task='ideal'|'habits'|'reflection'|'keywords';
export type Plan={environment:string;role:string;activities:string[];emotions:string[];lifestyle:string;visualElements:string[];explicitFacts:string[];artisticAdditions:string[];uncertainties:string[];questions:string[];visual:Record<'subject'|'composition'|'environment'|'objects'|'lighting'|'colors'|'time'|'spatialRelations'|'mood',string>;prompt:string};
export type Analysis={summary:string;possibleDifferences:string[];uncertainties:string[]};
export type Reflection={response:string;keywords:string[]};
export type CloudWord={word:string;frequency:number};
export function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new ValidationError('Invalid object');return v as Record<string,unknown>}
export function string(v:unknown,max=2000):string{if(typeof v!=='string'||v.length>max)throw new ValidationError('Invalid text');return v.trim()}
export function strings(v:unknown,maxItems=12,maxLength=300):string[]{if(!Array.isArray(v)||v.length>maxItems)throw new ValidationError('Invalid list');return v.map(x=>string(x,maxLength))}
export function validateResult(task:Task,value:unknown):Plan|Analysis|Reflection|{keywords:string[]}{
 const v=object(value);
 if(task==='ideal'){
  const visual=object(v.visual),keys=['subject','composition','environment','objects','lighting','colors','time','spatialRelations','mood'] as const;
  const result={environment:string(v.environment),role:string(v.role),activities:strings(v.activities),emotions:strings(v.emotions),lifestyle:string(v.lifestyle),visualElements:strings(v.visualElements),explicitFacts:strings(v.explicitFacts),artisticAdditions:strings(v.artisticAdditions),uncertainties:strings(v.uncertainties),questions:strings(v.questions,2,150),visual:Object.fromEntries(keys.map(k=>[k,string(visual[k],1000)])) as Plan['visual'],prompt:string(v.prompt,5000)};
  if(!result.prompt||!result.explicitFacts.length)throw new ValidationError('Missing scene intent');return result;
 }
 if(task==='habits')return {summary:string(v.summary,1000),possibleDifferences:strings(v.possibleDifferences,5,300),uncertainties:strings(v.uncertainties,5,300)};
 if(task==='reflection')return {response:string(v.response,600),keywords:strings(v.keywords,3,16)};
 return {keywords:strings(v.keywords,3,16)};
}
export function cleanWords(value:unknown):string[]{
 const words=strings(value,3,40).map(w=>w.normalize('NFKC').replace(/[\s，。！？、；：,.!?;:'"“”‘’]/gu,'').trim()).map(w=>w==='开心'?'快乐':w).filter(Boolean);
 if(!words.length)throw new ValidationError('Empty words');
 for(const w of words)if([...w].length>4||[...w].length<2||!/^\p{L}+$/u.test(w)||/(先生|女士|姓名|地址|账号|微信|电话|住址|身份证|自杀|杀人|性爱)/u.test(w))throw new ValidationError('公开词语应为2至4个文字，不能含身份信息或敏感内容。');
 return [...new Set(words)];
}
