/** Lake only. The photograph supplies EVERY visible water pixel. The auxiliary
 * noise texture is displacement data, never an overlaid wave/glow image. */
const W=1672,H=941,TOP=630,CH=H-TOP;
export const page02WaterSettings=Object.freeze({
 waveStrength:1.8,
 waveSpeed:1.15,
 waveScale:1,
 reflectionStrength:1.5,
 dprCap:1.25,
 maxPixels:480000,
 softwarePixels:220000,
 minPixels:140000,
});
// Native-photo shoreline, with conservative clearance around foreground plants.
// Feathering is clipped to this contour, so it never moves rocks or petals.
const lakePath='M552 657 C730 655 846 649 1000 651 L1170 651 L1252 663 L1390 662 L1530 656 L1672 655 L1672 941 L948 941 C892 924 855 935 819 904 L816 883 L765 871 L711 853 L653 844 L606 834 L558 812 L542 788 L525 777 L509 785 L494 792 L484 791 L483 760 L472 750 L455 752 L437 773 L425 786 L414 779 L405 766 L389 754 L379 768 L385 789 L376 792 L351 793 L319 789 L298 775 L282 770 L276 745 L262 726 L240 725 L235 710 C320 706 407 712 490 709 L551 708 L562 693 Z';

let cachedMask:ImageData|undefined;
function makeMask(){
 if(cachedMask)return cachedMask;
 const hard=document.createElement('canvas');hard.width=W;hard.height=CH;
 const h=hard.getContext('2d')!;h.translate(0,-TOP);h.fillStyle='white';h.fill(new Path2D(lakePath));
 // Pack shoreline coverage (A) and source-sampling clearance (R) together.
 // A one-time distance transform replaces the second mask fetch every frame.
 const source=h.getImageData(0,0,W,CH),distance=new Uint16Array(W*CH);
 for(let i=0;i<distance.length;i++)distance[i]=source.data[i*4+3]>127?65000:0;
 for(let y=0;y<CH;y++)for(let x=0;x<W;x++){
  const i=y*W+x;if(!distance[i])continue;
  let d=distance[i];if(x)d=Math.min(d,distance[i-1]+3);
  if(y){d=Math.min(d,distance[i-W]+3);if(x)d=Math.min(d,distance[i-W-1]+4);if(x<W-1)d=Math.min(d,distance[i-W+1]+4)}distance[i]=d;
 }
 for(let y=CH-1;y>=0;y--)for(let x=W-1;x>=0;x--){
  const i=y*W+x;if(!distance[i])continue;
  let d=distance[i];if(x<W-1)d=Math.min(d,distance[i+1]+3);
  if(y<CH-1){d=Math.min(d,distance[i+W]+3);if(x)d=Math.min(d,distance[i+W-1]+4);if(x<W-1)d=Math.min(d,distance[i+W+1]+4)}distance[i]=d;
 }
 for(let i=0;i<distance.length;i++){
  const d=distance[i]/3,edge=Math.min(1,d/3),clearance=Math.min(1,d/24);
  source.data[i*4]=Math.round(clearance*255);source.data[i*4+1]=0;source.data[i*4+2]=0;
  source.data[i*4+3]=Math.round(source.data[i*4+3]*edge*edge*(3-2*edge));
 }
 cachedMask=source;return source;
}
const vs='attribute vec2 a;varying vec2 v;void main(){v=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}';
const fs=`precision highp float;
varying vec2 v;uniform sampler2D photo,shore,noiseMap;
uniform vec2 sourceOrigin,sourceExtent;uniform float time;uniform vec4 waterTuning;
vec4 noiseField(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return texture2D(noiseMap,(i+f+.5)/64.);}
vec2 photoUV(vec2 p){return vec2(p.x/1672.,(p.y-630.)/311.);}
void main(){
 vec2 p=sourceOrigin+v*sourceExtent;
 vec4 coast=texture2D(shore,photoUV(p));float mask=coast.a;
 if(mask<.001){gl_FragColor=vec4(0.);return;}
 float depth=clamp((p.y-653.)/288.,0.,1.);
 // Perspective compresses distant ripples; the near lake has wider wavelengths.
 float perspective=.45+1.15*sqrt(depth);
 vec2 q=vec2(p.x/(125.*perspective),log(1.+depth*7.)*5.5)*waterTuning.z;
 float t=time*waterTuning.y;
 vec4 large=noiseField(q*.68+vec2(t*.31,-t*.23));
 vec4 middle=noiseField(q*1.83+vec2(-t*.49,t*.35)+(large.rg-.5)*.7);
 vec4 fine=noiseField(q*4.9+vec2(t*.78,t*.59)+(middle.ba-.5)*.45);
 // Three independently advected scales, no time modulo or loop restart.
 vec2 flow=(large.rg-.5)*1.35+(middle.ba-.5)*.8+(fine.rg-.5)*.23;
 float strength=(.5+13.5*pow(depth,.68))*waterTuning.x;
 vec2 displacement=flow*vec2(strength,strength*.48);
 displacement.y+=(middle.r-.5)*depth*3.*waterTuning.w;
 // Smoothly bound foreground refraction near 16px horizontal / 7px vertical.
 vec2 limits=mix(vec2(1.,.4),vec2(16.,7.),pow(depth,.68));
 vec2 relative=displacement/limits;
 displacement/=sqrt(vec2(1.)+relative*relative);
 displacement*=mask*coast.r;
 vec3 color=texture2D(photo,photoUV(p+displacement)).rgb;
 float gold=smoothstep(.52,.92,dot(color,vec3(.2126,.7152,.0722)))*smoothstep(.015,.12,color.r-color.b);
 // Modulate actual golden highlights; no new white ripple lines are painted.
 float glint=((fine.b-.5)*.11+(middle.g-.5)*.035)*waterTuning.w;
 color*=1.+glint*gold*(.4+.6*depth);
 gl_FragColor=vec4(color*mask,mask);
}`;

export function createPage02Water(parent:HTMLCanvasElement,image:HTMLImageElement){
 const canvas=document.createElement('canvas');canvas.dataset.waterMaterial='loading';canvas.setAttribute('aria-hidden','true');parent.insertAdjacentElement('afterend',canvas);
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
 if(!gl){canvas.remove();return null}
 const shaders:WebGLShader[]=[],textures:WebGLTexture[]=[];
 const program=gl.createProgram()!,buffer=gl.createBuffer()!;
 const dispose=()=>{textures.forEach(t=>gl.deleteTexture(t));shaders.forEach(s=>gl.deleteShader(s));gl.deleteBuffer(buffer);gl.deleteProgram(program);canvas.remove();queueMicrotask(()=>gl.getExtension('WEBGL_lose_context')?.loseContext())};
 try{
  for(const [type,source]of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]as const){const s=gl.createShader(type)!;shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Water shader');gl.attachShader(program,s)}
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Water program');gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const photograph=document.createElement('canvas');photograph.width=W;photograph.height=CH;photograph.getContext('2d')!.drawImage(image,0,TOP,W,CH,0,0,W,CH);
  const noise=new Uint8Array(64*64*4);let seed=0x5e1f;
  for(let i=0;i<noise.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;noise[i]=seed&255}
  const upload=(unit:number,name:string,source:HTMLCanvasElement|ImageData|Uint8Array)=>{
   const texture=gl.createTexture()!;textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,source instanceof Uint8Array?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,source instanceof Uint8Array?gl.REPEAT:gl.CLAMP_TO_EDGE);
   if(source instanceof Uint8Array)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,64,64,0,gl.RGBA,gl.UNSIGNED_BYTE,source);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   gl.uniform1i(gl.getUniformLocation(program,name),unit);
  };
  upload(0,'photo',photograph);upload(1,'shore',makeMask());upload(2,'noiseMap',noise);
  const tuning=page02WaterSettings;gl.uniform4f(gl.getUniformLocation(program,'waterTuning'),tuning.waveStrength,tuning.waveSpeed,tuning.waveScale,tuning.reflectionStrength);
 }catch(error){console.warn('Page02 lake material unavailable.',error);dispose();return null}
 canvas.dataset.waterMaterial='ready';
 const origin=gl.getUniformLocation(program,'sourceOrigin'),extent=gl.getUniformLocation(program,'sourceExtent'),clock=gl.getUniformLocation(program,'time');
 const info=gl.getExtension('WEBGL_debug_renderer_info');
 const software=info&&/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)));
 let camera:number[]|null=null,quality:number=software?page02WaterSettings.softwarePixels:page02WaterSettings.maxPixels,lastSize='',samples=0,total=0;
 const resize=(w:number,h:number,dw:number,dh:number,dx:number,dy:number)=>{
  camera=[w,h,dw,dh,dx,dy];const scale=dw/W,top=Math.max(0,dy+TOP*scale),bottom=Math.min(h,dy+H*scale),height=Math.max(1,bottom-top);
  Object.assign(canvas.style,{inset:'auto',left:'0px',top:`${top}px`,width:`${w}px`,height:`${height}px`});
  const density=Math.min(devicePixelRatio||1,page02WaterSettings.dprCap,Math.sqrt(quality/(w*height))),pw=Math.max(1,Math.round(w*density)),ph=Math.max(1,Math.round(height*density)),key=`${pw}:${ph}`;
  if(key!==lastSize){canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);lastSize=key}
  gl.uniform2f(origin,-dx/scale,(top-dy)/scale);gl.uniform2f(extent,w/scale,height/scale);
  canvas.dataset.sourceCamera=JSON.stringify({x:-dx/scale,y:(top-dy)/scale,width:w/scale,height:height/scale,scale});
 };
 return{
  resize,
  adapt(interval:number){if(interval<=0)return;total+=Math.min(interval,120);samples++;if(samples===20){if(total/samples>38&&quality>page02WaterSettings.minPixels&&camera){quality=Math.max(page02WaterSettings.minPixels,Math.floor(quality*.75));resize(...camera as [number,number,number,number,number,number])}samples=0;total=0}},
  draw(t:number,enabled:boolean){if(!enabled){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);return}gl.uniform1f(clock,t);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.waterTime=t.toFixed(3)},
  dispose,
 };
}
