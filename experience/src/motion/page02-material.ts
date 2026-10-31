/** Local texture deformation of the approved photograph, never the terrain/UI.
 * Coordinates and masks are in native page02.png pixels (1672 × 941).
 * Small bounded deformation avoids exposing holes in this flattened artwork. */
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
 float bank=480.+max(0.,p.y-700.)*1.9;
 float water=smoothstep(659.,676.,p.y)*smoothstep(bank,bank+35.,p.x)*layers.y;
 float alpha=max(sky,max(water,mist));
 if(alpha<.001){gl_FragColor=vec4(0.);return;}
 vec3 color;
 if(water>max(sky,mist)){
  float near=clamp((p.y-658.)/283.,0.,1.);
  float wave=sin(p.y*.29-t*1.16+1.5*sin(p.x*.008+t*.13));
  float fine=sin(p.y*.71+p.x*.013-t*1.7);
  vec2 ripple=vec2((1.1+3.1*near)*wave+.65*fine,(.18+.68*near)*sin(p.y*.35+p.x*.011-t*.9));
  color=texture2D(photo,(p+ripple*wind)/vec2(1672.,941.)).rgb;
  float reflection=exp(-pow((p.x-1155.)/(38.+near*100.),2.));
  color+=vec3(1.,.83,.56)*(reflection*(.012*wave+.009*(sun-.5))+.0025*fine*near);
 }else if(mist>sky){
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
 const software=info&&/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)));
 const budget=software?320000:1200000;
 const u=(name:string)=>gl.getUniformLocation(program,name);
 const viewport=u('viewport'),draw=u('draw'),origin=u('origin'),time=u('time'),layers=u('layers');
 return{
  resize(w:number,h:number,dw:number,dh:number,dx:number,dy:number){
   // At most 1.2M pixels; no full-DPR 4K continuous rendering.
   const ratio=Math.min(devicePixelRatio||1,Math.sqrt(budget/(w*h)),w<=700?1.5:1);
   canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));gl.viewport(0,0,canvas.width,canvas.height);
   gl.uniform2f(viewport,w,h);gl.uniform2f(draw,dw,dh);gl.uniform2f(origin,dx,dy);
  },
  draw(t:number,enabled:[number,number,number]){gl.uniform1f(time,t);gl.uniform3fv(layers,enabled);gl.drawArrays(gl.TRIANGLES,0,6)},
  dispose(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));queueMicrotask(()=>{if(!canvas.isConnected)gl.getExtension('WEBGL_lose_context')?.loseContext()})}
 };
}
