export interface SceneFrame {ctx:CanvasRenderingContext2D;w:number;h:number;t:number;image:CanvasImageSource|null;imageWidth:number;imageHeight:number;playback:number;variant:number;listening:boolean}
export type ScenePainter=(frame:SceneFrame)=>void;
export interface SceneDefinition {id:string;component:string;asset:string;paint:ScenePainter;motion:string[]}
export function cover(f:SceneFrame,zoom=1,dx=0,dy=0){if(!f.image)return;const s=Math.max(f.w/f.imageWidth,f.h/f.imageHeight)*zoom;f.ctx.drawImage(f.image,(f.w-f.imageWidth*s)/2+dx,(f.h-f.imageHeight*s)/2+dy,f.imageWidth*s,f.imageHeight*s)}
