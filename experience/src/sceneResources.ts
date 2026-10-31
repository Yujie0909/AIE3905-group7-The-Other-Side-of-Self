import type {Page} from './session';
import {backgroundAssets} from './backgroundAssets';
export type ResourceStatus='idle'|'loading'|'ready'|'error';
type Priority='high'|'low';
type Asset={image:HTMLImageElement;status:ResourceStatus;promise:Promise<void>;error?:Error};
type Scene={status:ResourceStatus;promise?:Promise<void>;error?:Error};
const assets=new Map<string,Asset>(),scenes=new Map<string,Scene>();
export const isWideScene=()=>matchMedia('(min-width:701px)').matches;
export function sceneURLs(page:Page,wide:boolean){const s=backgroundAssets[page];return [s.plate,...(wide&&s.artwork?[s.artwork]:[])]}
export function decodeBackground(url:string,priority:Priority='high'):Promise<void>{
 const cached=assets.get(url);
 if(cached&&cached.status!=='error'){if(priority==='high')cached.image.fetchPriority='high';return cached.promise}
 // Bootstrap has already started decoding Page01 before React loads. Adopt
 // that image and promise instead of starting a second decode of its pixels.
 const bootstrap=document.getElementById('initial-scene-image') as (HTMLImageElement&{sceneDecoded?:Promise<void>})|null;
 const initial=!cached&&bootstrap?.src===new URL(url,document.baseURI).href?bootstrap.sceneDecoded:undefined;
 const image=initial?bootstrap!:new Image();image.decoding='async';image.fetchPriority=priority;
 const asset:Asset={image,status:'loading',promise:Promise.resolve()};
 asset.promise=new Promise<void>((resolve,reject)=>{
  let settled=false;
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(deadline);image.onload=null;image.onerror=null;if(error){asset.status='error';asset.error=error;reject(error)}else{asset.status='ready';resolve()}};
  // A network/decode deadline, never an artificial page-transition delay.
  const deadline=setTimeout(()=>{finish(new Error('Background preparation timed out'));image.removeAttribute('src')},45000);
  if(initial)initial.then(()=>finish(),()=>finish(new Error('Background decode failed')));
  else{
   image.onload=()=>image.decode().then(()=>finish(),()=>finish(new Error('Background decode failed')));
   image.onerror=()=>finish(new Error('Background request failed'));
   image.src=url;
  }
 });
 assets.set(url,asset);asset.promise.catch(()=>{});return asset.promise;
}
export function getSceneStatus(page:Page,wide=isWideScene()):ResourceStatus{return scenes.get(`${page}:${wide}`)?.status??'idle'}
export function prepareScene(page:Page,wide=isWideScene(),priority:Priority='high'):Promise<void>{
 const key=`${page}:${wide}`,cached=scenes.get(key);
 // Keep the decoded Image alive and reuse its fulfilled preparation promise.
 // A navigation must not put an already-ready scene back into loading.
 if(cached?.status==='ready')return cached.promise!;
 if(cached?.status==='loading'){if(priority==='high')for(const url of sceneURLs(page,wide)){const a=assets.get(url);if(a)a.image.fetchPriority='high'}return cached.promise!}
 const scene:Scene={status:'loading'};scenes.set(key,scene);performance.mark(`scene:prepare:${page}:${wide}`);
 scene.promise=Promise.all(sceneURLs(page,wide).map(url=>decodeBackground(url,priority))).then(()=>{scene.status='ready';performance.mark(`scene:ready:${page}:${wide}`)},error=>{scene.status='error';scene.error=error;performance.mark(`scene:error:${page}:${wide}`);throw error});
 scene.promise.catch(()=>{});return scene.promise;
}
export async function prepareCurrentProfile(page:Page){let wide=isWideScene();for(;;){await prepareScene(page,wide,'high');const now=isWideScene();if(now===wide)return;wide=now}}

/** The retained decoded Image is shared by presentation checks, not re-decoded. */
export function getPreparedImage(url:string){const asset=assets.get(url);return asset?.status==='ready'?asset.image:null}
