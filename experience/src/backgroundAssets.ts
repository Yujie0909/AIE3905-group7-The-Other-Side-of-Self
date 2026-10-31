import type {Page} from './session';
/** Approved clean artwork. Originals: experience/background/page01–07.png. */
export const backgroundAssets:Record<Page,{plate:string;artwork?:string}>={
 1:{plate:new URL('./assets/final-backgrounds/page01.webp',import.meta.url).href},
 2:{plate:new URL('./assets/final-backgrounds/page02.webp',import.meta.url).href},
 3:{plate:new URL('./assets/final-backgrounds/page03.webp',import.meta.url).href},
 4:{plate:new URL('./assets/final-backgrounds/page04.webp',import.meta.url).href},
 5:{plate:new URL('./assets/final-backgrounds/page05.webp',import.meta.url).href},
 6:{plate:new URL('./assets/final-backgrounds/page06.webp',import.meta.url).href},
 7:{plate:new URL('./assets/final-backgrounds/page07.webp',import.meta.url).href},
};
