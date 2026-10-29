export const transitionDuration=1800;
export const easeScene=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x)};
