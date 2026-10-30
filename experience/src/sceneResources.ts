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
 const image=new Image();image.decoding='async';image.fetchPriority=priority;
 const asset:Asset={image,status:'loading',promise:Promise.resolve()};
 asset.promise=new Promise<void>((resolve,reject)=>{
  let settled=false;
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(deadline);image.onload=null;image.onerror=null;if(error){asset.status='error';asset.error=error;reject(error)}else{asset.status='ready';resolve()}};
  // A network/decode deadline, never an artificial page-transition delay.
  const deadline=setTimeout(()=>{finish(new Error('Background preparation timed out'));image.removeAttribute('src')},45000);
  image.onload=()=>image.decode().then(()=>finish(),()=>finish(new Error('Background decode failed')));
  image.onerror=()=>finish(new Error('Background request failed'));
  image.src=url;
 });
 assets.set(url,asset);asset.promise.catch(()=>{});return asset.promise;
}
export function getSceneStatus(page:Page,wide=isWideScene()):ResourceStatus{return scenes.get(`${page}:${wide}`)?.status??'idle'}
export function prepareScene(page:Page,wide=isWideScene(),priority:Priority='high',verifyReady=false):Promise<void>{
 const key=`${page}:${wide}`,cached=scenes.get(key);
 if(cached?.status==='ready'){
  if(!verifyReady)return cached.promise!;
  cached.status='loading';performance.mark(`scene:verify:${page}:${wide}`);
  cached.promise=Promise.all(sceneURLs(page,wide).map(url=>{const asset=assets.get(url)!;return asset.image.decode().catch(error=>{asset.status='error';throw error})})).then(()=>{cached.status='ready'},error=>{cached.status='error';cached.error=error;throw error});
  cached.promise.catch(()=>{});return cached.promise;
 }
 if(cached?.status==='loading'){if(priority==='high')for(const url of sceneURLs(page,wide)){const a=assets.get(url);if(a)a.image.fetchPriority='high'}return cached.promise!}
 const scene:Scene={status:'loading'};scenes.set(key,scene);performance.mark(`scene:prepare:${page}:${wide}`);
 scene.promise=Promise.all(sceneURLs(page,wide).map(url=>decodeBackground(url,priority))).then(()=>{scene.status='ready';performance.mark(`scene:ready:${page}:${wide}`)},error=>{scene.status='error';scene.error=error;performance.mark(`scene:error:${page}:${wide}`);throw error});
 scene.promise.catch(()=>{});return scene.promise;
}
export async function prepareCurrentProfile(page:Page){let wide=isWideScene();for(;;){await prepareScene(page,wide,'high',true);const now=isWideScene();if(now===wide)return;wide=now}}

/** Reuse the current scene's decoded bitmap; motion never creates image requests. */
export function getPreparedImage(url:string){const asset=assets.get(url);return asset?.status==='ready'?asset.image:null}
