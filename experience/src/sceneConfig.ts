import type {Page} from './session';
export const motionTokens={fadeOut:350,fadeIn:700,environment:1900,maxWidth:1280,fps:30,breathPeriod:10.7};
export const sceneConfig:Record<Page,{light:number;warmth:number;openness:number;mist:number;reflection:number;readability:number}>={
 1:{light:.83,warmth:.03,openness:0,mist:.12,reflection:.10,readability:0},
 2:{light:.94,warmth:.05,openness:.3,mist:.19,reflection:.12,readability:.58},
 3:{light:1.12,warmth:.07,openness:1,mist:.15,reflection:.14,readability:.58},
 4:{light:.98,warmth:.10,openness:.45,mist:.17,reflection:.10,readability:.58},
 5:{light:1.12,warmth:.07,openness:1,mist:.15,reflection:.14,readability:.58},
 6:{light:.94,warmth:.09,openness:.15,mist:.11,reflection:.09,readability:.58},
 7:{light:1.04,warmth:.13,openness:.4,mist:.13,reflection:.10,readability:.68}
};
