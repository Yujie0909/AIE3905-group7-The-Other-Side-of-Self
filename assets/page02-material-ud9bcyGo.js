const M=Object.freeze({waveStrength:1.8,waveSpeed:1.15,waveScale:1,reflectionStrength:1.5,dprCap:1.25,maxPixels:48e4,softwarePixels:22e4,minPixels:14e4}),I="M552 657 C730 655 846 649 1000 651 L1170 651 L1252 663 L1390 662 L1530 656 L1672 655 L1672 941 L948 941 C892 924 855 935 819 904 L816 883 L765 871 L711 853 L653 844 L606 834 L558 812 L542 788 L525 777 L509 785 L494 792 L484 791 L483 760 L472 750 L455 752 L437 773 L425 786 L414 779 L405 766 L389 754 L379 768 L385 789 L376 792 L351 793 L319 789 L298 775 L282 770 L276 745 L262 726 L240 725 L235 710 C320 706 407 712 490 709 L551 708 L562 693 Z";let b;function B(){if(b)return b;const h=document.createElement("canvas");h.width=1672,h.height=311;const E=h.getContext("2d");E.translate(0,-630),E.fillStyle="white",E.fill(new Path2D(I));const t=E.getImageData(0,0,1672,311),e=new Uint16Array(1672*311);for(let i=0;i<e.length;i++)e[i]=t.data[i*4+3]>127?65e3:0;for(let i=0;i<311;i++)for(let o=0;o<1672;o++){const a=i*1672+o;if(!e[a])continue;let n=e[a];o&&(n=Math.min(n,e[a-1]+3)),i&&(n=Math.min(n,e[a-1672]+3),o&&(n=Math.min(n,e[a-1672-1]+4)),o<1671&&(n=Math.min(n,e[a-1672+1]+4))),e[a]=n}for(let i=310;i>=0;i--)for(let o=1671;o>=0;o--){const a=i*1672+o;if(!e[a])continue;let n=e[a];o<1671&&(n=Math.min(n,e[a+1]+3)),i<310&&(n=Math.min(n,e[a+1672]+3),o&&(n=Math.min(n,e[a+1672-1]+4)),o<1671&&(n=Math.min(n,e[a+1672+1]+4))),e[a]=n}for(let i=0;i<e.length;i++){const o=e[i]/3,a=Math.min(1,o/3),n=Math.min(1,o/24);t.data[i*4]=Math.round(n*255),t.data[i*4+1]=0,t.data[i*4+2]=0,t.data[i*4+3]=Math.round(t.data[i*4+3]*a*a*(3-2*a))}return b=t,t}const k="attribute vec2 a;varying vec2 v;void main(){v=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}",G=`precision highp float;
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
}`;function N(h,E){const t=document.createElement("canvas");t.dataset.waterMaterial="loading",t.setAttribute("aria-hidden","true"),h.insertAdjacentElement("afterend",t);const e=t.getContext("webgl",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"low-power"});if(!e)return t.remove(),null;const i=[],o=[],a=e.createProgram(),n=e.createBuffer(),w=()=>{o.forEach(l=>e.deleteTexture(l)),i.forEach(l=>e.deleteShader(l)),e.deleteBuffer(n),e.deleteProgram(a),t.remove(),queueMicrotask(()=>{var l;return(l=e.getExtension("WEBGL_lose_context"))==null?void 0:l.loseContext()})};try{for(const[s,p]of[[e.VERTEX_SHADER,k],[e.FRAGMENT_SHADER,G]]){const m=e.createShader(s);if(i.push(m),e.shaderSource(m,p),e.compileShader(m),!e.getShaderParameter(m,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(m)||"Water shader");e.attachShader(a,m)}if(e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))throw Error(e.getProgramInfoLog(a)||"Water program");e.useProgram(a),e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);const l=e.getAttribLocation(a,"a");e.enableVertexAttribArray(l),e.vertexAttribPointer(l,2,e.FLOAT,!1,0,0);const d=document.createElement("canvas");d.width=1672,d.height=311,d.getContext("2d").drawImage(E,0,630,1672,311,0,0,1672,311);const v=new Uint8Array(4096*4);let r=24095;for(let s=0;s<v.length;s++)r^=r<<13,r^=r>>>17,r^=r<<5,v[s]=r&255;const c=(s,p,m)=>{const u=e.createTexture();o.push(u),e.activeTexture(e.TEXTURE0+s),e.bindTexture(e.TEXTURE_2D,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,m instanceof Uint8Array?e.REPEAT:e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,m instanceof Uint8Array?e.REPEAT:e.CLAMP_TO_EDGE),m instanceof Uint8Array?e.texImage2D(e.TEXTURE_2D,0,e.RGBA,64,64,0,e.RGBA,e.UNSIGNED_BYTE,m):e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,m),e.uniform1i(e.getUniformLocation(a,p),s)};c(0,"photo",d),c(1,"shore",B()),c(2,"noiseMap",v);const f=M;e.uniform4f(e.getUniformLocation(a,"waterTuning"),f.waveStrength,f.waveSpeed,f.waveScale,f.reflectionStrength)}catch(l){return console.warn("Page02 lake material unavailable.",l),w(),null}t.dataset.waterMaterial="ready";const g=e.getUniformLocation(a,"sourceOrigin"),W=e.getUniformLocation(a,"sourceExtent"),L=e.getUniformLocation(a,"time"),R=e.getExtension("WEBGL_debug_renderer_info"),S=R&&/swiftshader|llvmpipe|software/i.test(String(e.getParameter(R.UNMASKED_RENDERER_WEBGL)));let _=null,x=S?M.softwarePixels:M.maxPixels,T="",A=0,y=0;const U=(l,d,v,r,c,f)=>{_=[l,d,v,r,c,f];const s=v/1672,p=Math.max(0,f+630*s),m=Math.min(d,f+941*s),u=Math.max(1,m-p);Object.assign(t.style,{inset:"auto",left:"0px",top:`${p}px`,width:`${l}px`,height:`${u}px`});const D=Math.min(devicePixelRatio||1,M.dprCap,Math.sqrt(x/(l*u))),P=Math.max(1,Math.round(l*D)),C=Math.max(1,Math.round(u*D)),F=`${P}:${C}`;F!==T&&(t.width=P,t.height=C,e.viewport(0,0,P,C),T=F),e.uniform2f(g,-c/s,(p-f)/s),e.uniform2f(W,l/s,u/s),t.dataset.sourceCamera=JSON.stringify({x:-c/s,y:(p-f)/s,width:l/s,height:u/s,scale:s})};return{resize:U,adapt(l){l<=0||(y+=Math.min(l,120),A++,A===20&&(y/A>38&&x>M.minPixels&&_&&(x=Math.max(M.minPixels,Math.floor(x*.75)),U(..._)),A=0,y=0))},draw(l,d){if(!d){e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);return}e.uniform1f(L,l),e.drawArrays(e.TRIANGLES,0,6),t.dataset.waterTime=l.toFixed(3)},dispose:w}}const O="attribute vec2 a;varying vec2 v;void main(){v=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}",X=`precision highp float;
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
}`;function H(h,E){const t=h.getContext("webgl",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"low-power"});if(!t)return null;const e=[],i=(r,c)=>{const f=t.createShader(r);if(e.push(f),t.shaderSource(f,c),t.compileShader(f),!t.getShaderParameter(f,t.COMPILE_STATUS))throw Error(t.getShaderInfoLog(f)||"Page02 shader");return f},o=t.createProgram(),a=t.createBuffer(),n=t.createTexture();try{if(t.attachShader(o,i(t.VERTEX_SHADER,O)),t.attachShader(o,i(t.FRAGMENT_SHADER,X)),t.linkProgram(o),!t.getProgramParameter(o,t.LINK_STATUS))throw Error(t.getProgramInfoLog(o)||"Page02 program");t.useProgram(o),t.bindBuffer(t.ARRAY_BUFFER,a),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),t.STATIC_DRAW);const r=t.getAttribLocation(o,"a");t.enableVertexAttribArray(r),t.vertexAttribPointer(r,2,t.FLOAT,!1,0,0),t.bindTexture(t.TEXTURE_2D,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,E)}catch(r){return t.deleteTexture(n),t.deleteBuffer(a),t.deleteProgram(o),e.forEach(c=>t.deleteShader(c)),console.warn("Page02 material unavailable; keeping original scene.",r),null}const w=t.getExtension("WEBGL_debug_renderer_info"),g=N(h,E);let L=w&&/swiftshader|llvmpipe|software/i.test(String(t.getParameter(w.UNMASKED_RENDERER_WEBGL)))?32e4:12e5,R=0,S=0,_=null,x=!0;const T=r=>t.getUniformLocation(o,r),A=T("viewport"),y=T("draw"),U=T("origin"),l=T("time"),d=T("layers"),v=(r,c,f,s,p,m)=>{_=[r,c,f,s,p,m];const u=Math.min(devicePixelRatio||1,Math.sqrt(L/(r*c)),r<=700?1.5:1);h.width=Math.max(1,Math.round(r*u)),h.height=Math.max(1,Math.round(c*u)),t.viewport(0,0,h.width,h.height);const D=Math.min(c,Math.max(0,m+658*s/941)),P=Math.max(0,h.height-Math.ceil(D/c*h.height));t.enable(t.SCISSOR_TEST),t.scissor(0,P,h.width,h.height-P),t.uniform2f(A,r,c),t.uniform2f(y,f,s),t.uniform2f(U,p,m),g==null||g.resize(r,c,f,s,p,m)};return{resize:v,adapt(r){g==null||g.adapt(r),!(r<=0)&&(S+=Math.min(r,120),R++,R===15&&(S/R>38&&L>32e4&&_&&(L=Math.max(32e4,Math.floor(L*.55)),v(..._)),R=0,S=0))},draw(r,c){c[0]||c[2]?(t.uniform1f(l,r),t.uniform3fv(d,c),t.drawArrays(t.TRIANGLES,0,6),x=!0):x&&(t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),x=!1),g==null||g.draw(r,!!c[1])},dispose(){g==null||g.dispose(),t.deleteTexture(n),t.deleteBuffer(a),t.deleteProgram(o),e.forEach(r=>t.deleteShader(r)),queueMicrotask(()=>{var r;h.isConnected||(r=t.getExtension("WEBGL_lose_context"))==null||r.loseContext()})}}}export{H as createPage02Material};
