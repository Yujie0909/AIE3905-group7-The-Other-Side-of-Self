import type {BackgroundFrame} from '../backgroundLoading';
import {backgroundAssets} from '../backgroundAssets';
import './background-readiness.css';
/** Last fully decoded scenery only; contains no user text or interactive UI. */
export function BackgroundFallback({frame}:{frame:BackgroundFrame}){return <div className="background-fallback" aria-hidden="true">
 <img className="background-fallback-image" src={backgroundAssets[frame.page].plate} style={{objectPosition:frame.objectPosition}} alt="" draggable={false}/>
 {frame.shade!=='none'&&<span className="background-fallback-shade" style={{backgroundImage:frame.shade}}/>}
 {frame.mobileShade!=='none'&&<span className="background-fallback-mobile" style={{backgroundImage:frame.mobileShade}}/>}
 </div>}
