/** Traced against the existing 1672 × 941 Page02 artwork. The photograph,
 * composition and original ribbon texture remain unchanged. */
export const page02RibbonRoutes = [
  {name:'rising',period:10400,phase:.20,d:'M760 407 C805 440 855 453 900 450 C1038 464 1100 370 1160 237 C1220 105 1302 43 1403 -20'},
  {name:'diagonal',period:11600,phase:.55,d:'M830 431 C911 460 987 432 1056 399 C1194 330 1289 185 1434 108 C1514 77 1595 61 1690 53'},
  {name:'right-fold',period:9200,phase:.12,d:'M1044 387 C1138 288 1184 269 1253 274 C1411 273 1513 383 1690 294'},
] as const;

export function Page02LightRibbon(){
 return <g className="page02-light-ribbon" fill="none" strokeLinecap="round" aria-hidden="true">
  {page02RibbonRoutes.map(route=><g key={route.name} data-dream-loop="ribbon" data-ribbon-route={route.name} data-period={route.period} data-phase={route.phase}>
   <path data-ribbon-guide="true" d={route.d} stroke="#f9dba3" strokeWidth="9" opacity=".035"/>
  </g>)}
 </g>
}

type Animator=(node:Element,frames:Keyframe[],duration:number)=>Animation;

/** Overlapping, feathered sections make ONE continuous curved light pulse.
 * Each section follows the same SVG curve at a fixed arc-length interval.
 * The browser composites cached small gradients; no SVG gradient/mask surface
 * is repainted per frame, no particles are random, and no new rAF is started. */
export function mountPage02Ribbon(tile:HTMLDivElement,group:SVGGraphicsElement,origin:{x:number;y:number},scale:number,animate:Animator){
 const guide=group.querySelector<SVGPathElement>('[data-ribbon-guide]')!;
 const period=Number(group.dataset.period),phase=Number(group.dataset.phase);
 if(!CSS.supports('offset-path','path("M0 0L1 1")')){
  // Compatibility fallback: keep a genuinely travelling SVG stroke, never
  // silently replace the flow with a whole-scene opacity animation.
  const stroke=guide.cloneNode() as SVGPathElement;
  stroke.removeAttribute('data-ribbon-guide');stroke.dataset.dreamLoop='stream';
  stroke.setAttribute('pathLength','1000');stroke.setAttribute('stroke-dasharray','125 875');stroke.setAttribute('stroke-width','3');stroke.setAttribute('opacity','.7');stroke.setAttribute('stroke','#ffe7ad');
  group.append(stroke);animate(stroke,[{strokeDashoffset:0},{strokeDashoffset:-1000}],period);return;
 }
 let axis=0;
 const route=guide.getAttribute('d')!.replace(/[A-Za-z]|[-+]?(?:\d*\.)?\d+/g,token=>{
  if(/[A-Za-z]/.test(token)){axis=0;return token}
  return String((Number(token)-(axis++%2===0?origin.x:origin.y))*scale);
 });
 const length=guide.getTotalLength();
 for(let i=0;i<11;i++){
  const section=document.createElement('i');
  section.className='dream-flow page02-ribbon-section';section.dataset.dreamLoop='flow';section.dataset.ribbonSection=String(i);
  Object.assign(section.style,{
   width:`${92*scale}px`,height:`${24*scale}px`,offsetPath:`path('${route}')`,offsetRotate:'auto',
   background:'radial-gradient(ellipse,rgba(255,247,217,.98) 0%,rgba(255,234,185,.8) 16%,rgba(255,219,153,.25) 43%,rgba(255,217,151,0) 72%)',
  });
  tile.append(section);
  const peak=.64*Math.exp(-Math.pow((i-5)/3.1,2));
  const animation=animate(section,[
   {offsetDistance:'0%',opacity:0},
   {offsetDistance:'13%',opacity:peak,offset:.13},
   {offsetDistance:'87%',opacity:peak,offset:.87},
   {offsetDistance:'100%',opacity:0},
  ],period);
  // Shared speed with deterministic spatial offsets; the overlapping sections
  // stay together as a ribbon, including through turns and viewport resizing.
  animation.currentTime=((phase+(i-5)*18/length+1)%1)*period;
 }
}
