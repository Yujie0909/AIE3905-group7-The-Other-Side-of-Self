/** Local texture deformation of the approved photograph, never the terrain/UI.
 * Coordinates and masks are in native page02.png pixels (1672 × 941).
 * Small bounded deformation avoids exposing holes in this flattened artwork. */
import {createPage02Water} from './page02-water';
const vertex=`attribute vec2 a;varying vec2 v;void main(){v=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 v;uniform sampler2D photo;uniform vec2 viewport,draw,origin;uniform float time;uniform vec3 layers;
float ellipse(vec2 p,vec2 c,vec2 r){float d=length((p-c)/r);return 1.-smoothstep(.55,1.,d);}
float ridge(float x){
 float y=420.;
 if(x<150.)y=mix(420.,410.,x/150.);
 else if(x<320.)y=mix(410.,412.,(x-150.)/170.);
 else if(x<510.)y=mix(412.,495.,(x-320.)/190.);
 else if(x<1000.)y=mix(495.,510.,(x-510.)/490.);
 else if(x<1200.)y=mix(510.,474.,(x-1000.)/200.);
 else if(x<1390.)y=mix(474.,395.,(x-1200.)/190.);
 else y=mix(395.,395.,(x-1390.)/282.);
 return y;
}
void main(){
 vec2 uv=(v*viewport-origin)/draw;vec2 p=uv*vec2(1672.,941.);
 if(min(uv.x,uv.y)<0.||max(uv.x,uv.y)>1.){gl_FragColor=vec4(0.);return;}
 float t=time,wind=1.+.18*sin(t*.17),sun=.5+.5*sin(t*.43+.6);
 // Sky fades BEFORE the actual skyline and left foliage. No mountain samples move.
 float sky=(1.-smoothstep(ridge(p.x)-38.,ridge(p.x)-12.,p.y));
 sky*=1.-(1.-smoothstep(40.,145.,p.x))*smoothstep(205.,285.,p.y);
 sky*=layers.x;
 // Native pale fog patches; background terrain stays outside these masks.
 float mist=max(ellipse(p,vec2(950.,639.),vec2(225.,16.)),ellipse(p,vec2(610.,631.),vec2(135.,13.)))*layers.z;
 float alpha=max(sky,mist);
 if(alpha<.001){gl_FragColor=vec4(0.);return;}
 vec3 color;
 if(mist>sky){
  vec2 drift=vec2(4.8*sin(t*.23+p.y*.03),.5*sin(t*.18+p.x*.02));
  color=texture2D(photo,(p+drift)/vec2(1672.,941.)).rgb;
 }else{
  vec2 air=vec2(6.8*sin(p.y*.009+t*.19)+2.6*sin(p.x*.006+p.y*.014+t*.115),1.8*sin(p.x*.008+t*.14));
  color=texture2D(photo,(p+air*wind)/vec2(1672.,941.)).rgb;
  color+=vec3(1.,.78,.48)*ellipse(p,vec2(1145.,475.),vec2(190.,120.))*(sun-.5)*.024;
 }
 gl_FragColor=vec4(color*alpha,alpha);
}`;

export function createPage02Material(canvas:HTMLCanvasElement,image:HTMLImageElement){
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
 if(!gl)return null;
 const shaders:WebGLShader[]=[];
 const compile=(type:number,source:string)=>{const s=gl.createShader(type)!;shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Page02 shader');return s};
 const program=gl.createProgram()!,buffer=gl.createBuffer()!,texture=gl.createTexture()!;
 try{
  gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)||'Page02 program');
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 }catch(error){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));console.warn('Page02 material unavailable; keeping original scene.',error);return null}
 const info=gl.getExtension('WEBGL_debug_renderer_info');
 const water=createPage02Water(canvas,image);
 const software=info&&/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)));
 let budget=software?320000:1200000;
 let samples=0,total=0;
 let camera:[number,number,number,number,number,number]|null=null;
 let atmosphereVisible=true;
 const u=(name:string)=>gl.getUniformLocation(program,name);
 const viewport=u('viewport'),draw=u('draw'),origin=u('origin'),time=u('time'),layers=u('layers');
 const resize=(w:number,h:number,dw:number,dh:number,dx:number,dy:number)=>{
   camera=[w,h,dw,dh,dx,dy];
   // At most 1.2M pixels; no full-DPR 4K continuous rendering.
   const ratio=Math.min(devicePixelRatio||1,Math.sqrt(budget/(w*h)),w<=700?1.5:1);
   canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));gl.viewport(0,0,canvas.width,canvas.height);
   gl.uniform2f(viewport,w,h);gl.uniform2f(draw,dw,dh);gl.uniform2f(origin,dx,dy);
   water?.resize(w,h,dw,dh,dx,dy);
 }
 return{
  resize,
  adapt(interval:number){
   water?.adapt(interval);
   // Some privacy-preserving browsers report a generic GPU name even when
   // software-rendered. Use measured frame intervals, not only that name.
   if(interval<=0||interval>180)return;
   total+=interval;samples++;
   if(samples===30){if(total/samples>38&&budget>320000&&camera){budget=Math.max(320000,Math.floor(budget*.55));resize(...camera)}samples=0;total=0}
  },
  draw(t:number,enabled:[number,number,number]){if(enabled[0]||enabled[2]){gl.uniform1f(time,t);gl.uniform3fv(layers,enabled);gl.drawArrays(gl.TRIANGLES,0,6);atmosphereVisible=true}else if(atmosphereVisible){gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);atmosphereVisible=false}water?.draw(t,Boolean(enabled[1]))},
  dispose(){water?.dispose();gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));queueMicrotask(()=>{if(!canvas.isConnected)gl.getExtension('WEBGL_lose_context')?.loseContext()})}
 };
}
