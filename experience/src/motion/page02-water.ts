/** Lake only. The photograph supplies EVERY visible water pixel. The auxiliary
 * noise texture is displacement data, never an overlaid wave/glow image. */
const W=1672,H=941,TOP=630,CH=H-TOP;
// Native-photo shoreline, with conservative clearance around foreground plants.
// Feathering is clipped to this contour, so it never moves rocks or petals.
const lakePath='M552 657 C730 655 846 649 1000 651 L1170 651 L1252 663 L1390 662 L1530 656 L1672 655 L1672 941 L948 941 C892 924 855 935 819 904 L816 883 L765 871 L711 853 L653 844 L606 834 L558 812 L542 788 L525 777 L509 785 L494 792 L484 791 L483 760 L472 750 L455 752 L437 773 L425 786 L414 779 L405 766 L389 754 L379 768 L385 789 L376 792 L351 793 L319 789 L298 775 L282 770 L276 745 L262 726 L240 725 L235 710 C320 706 407 712 490 709 L551 708 L562 693 Z';

function makeMask(){
 const hard=document.createElement('canvas');hard.width=W;hard.height=CH;
 const h=hard.getContext('2d')!;h.translate(0,-TOP);h.fillStyle='white';h.fill(new Path2D(lakePath));
 const soft=document.createElement('canvas');soft.width=W;soft.height=CH;
 const s=soft.getContext('2d')!;s.filter='blur(3px)';s.drawImage(hard,0,0);s.filter='none';s.globalCompositeOperation='destination-in';s.drawImage(hard,0,0);
 return soft;
}
const vs='attribute vec2 a;varying vec2 v;void main(){v=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}';
const fs=`precision highp float;
varying vec2 v;uniform sampler2D photo,shore,noiseMap;
uniform vec2 sourceOrigin,sourceExtent;uniform float time;
vec4 noiseField(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return texture2D(noiseMap,(i+f+.5)/64.);}
vec2 photoUV(vec2 p){return vec2(p.x/1672.,(p.y-630.)/311.);}
void main(){
 vec2 p=sourceOrigin+v*sourceExtent;
 float mask=texture2D(shore,photoUV(p)).a;
 if(mask<.001){gl_FragColor=vec4(0.);return;}
 float depth=clamp((p.y-653.)/288.,0.,1.);
 // Perspective compresses distant ripples; the near lake has wider wavelengths.
 float perspective=.45+1.15*sqrt(depth);
 vec2 q=vec2(p.x/(125.*perspective),log(1.+depth*7.)*5.5);
 vec4 large=noiseField(q*.68+vec2(time*.31,-time*.23));
 vec4 middle=noiseField(q*1.83+vec2(-time*.49,time*.35)+(large.rg-.5)*.7);
 vec4 fine=noiseField(q*4.9+vec2(time*.78,time*.59)+(middle.ba-.5)*.45);
 // Three independently advected scales, no time modulo or loop restart.
 vec2 flow=(large.rg-.5)*1.35+(middle.ba-.5)*.8+(fine.rg-.5)*.23;
 float strength=.5+13.5*pow(depth,.68);
 vec2 displacement=flow*vec2(strength,strength*.48);
 displacement.y+=(middle.r-.5)*depth*3.;
 // A sampling collar keeps the refracted source inside the real water mask.
 float collar=texture2D(shore,photoUV(p+displacement)).a;
 displacement*=mask*collar;
 vec3 color=texture2D(photo,photoUV(p+displacement)).rgb;
 float gold=smoothstep(.52,.92,dot(color,vec3(.2126,.7152,.0722)))*smoothstep(.015,.12,color.r-color.b);
 // Modulate actual golden highlights; no new white ripple lines are painted.
 float glint=(fine.b-.5)*.11+(middle.g-.5)*.035;
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
  const upload=(unit:number,name:string,source:HTMLCanvasElement|Uint8Array)=>{
   const texture=gl.createTexture()!;textures.push(texture);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,source instanceof Uint8Array?gl.REPEAT:gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,source instanceof Uint8Array?gl.REPEAT:gl.CLAMP_TO_EDGE);
   if(source instanceof Uint8Array)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,64,64,0,gl.RGBA,gl.UNSIGNED_BYTE,source);else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
   gl.uniform1i(gl.getUniformLocation(program,name),unit);
  };
  upload(0,'photo',photograph);upload(1,'shore',makeMask());upload(2,'noiseMap',noise);
 }catch(error){console.warn('Page02 lake material unavailable.',error);dispose();return null}
 canvas.dataset.waterMaterial='ready';
 const origin=gl.getUniformLocation(program,'sourceOrigin'),extent=gl.getUniformLocation(program,'sourceExtent'),clock=gl.getUniformLocation(program,'time');
 const info=gl.getExtension('WEBGL_debug_renderer_info');
 const software=info&&/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)));
 let camera:number[]|null=null,quality=software?360000:700000,lastSize='',samples=0,total=0;
 const resize=(w:number,h:number,dw:number,dh:number,dx:number,dy:number)=>{
  camera=[w,h,dw,dh,dx,dy];const scale=dw/W,top=Math.max(0,dy+TOP*scale),bottom=Math.min(h,dy+H*scale),height=Math.max(1,bottom-top);
  Object.assign(canvas.style,{inset:'auto',left:'0px',top:`${top}px`,width:`${w}px`,height:`${height}px`});
  const density=Math.min(devicePixelRatio||1,1.5,Math.sqrt(quality/(w*height))),pw=Math.max(1,Math.round(w*density)),ph=Math.max(1,Math.round(height*density)),key=`${pw}:${ph}`;
  if(key!==lastSize){canvas.width=pw;canvas.height=ph;gl.viewport(0,0,pw,ph);lastSize=key}
  gl.uniform2f(origin,-dx/scale,(top-dy)/scale);gl.uniform2f(extent,w/scale,height/scale);
  canvas.dataset.sourceCamera=JSON.stringify({x:-dx/scale,y:(top-dy)/scale,width:w/scale,height:height/scale,scale});
 };
 return{
  resize,
  adapt(interval:number){if(interval<=0||interval>200)return;total+=interval;samples++;if(samples===40){if(total/samples>45&&quality>260000&&camera){quality=Math.max(260000,Math.floor(quality*.7));resize(...camera as [number,number,number,number,number,number])}samples=0;total=0}},
  draw(t:number,enabled:boolean){if(!enabled){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);return}gl.uniform1f(clock,t);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.waterTime=t.toFixed(3)},
  dispose,
 };
}
