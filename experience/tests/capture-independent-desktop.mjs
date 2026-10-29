import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{const p=await b.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});await p.goto('http://localhost:5174');await p.waitForFunction(()=>document.querySelector('canvas')?.dataset.loaded==='true');
const shot=async n=>{await p.locator('.transition-layer.active').waitFor({state:'hidden'});await p.waitForTimeout(300);await p.screenshot({path:`artifacts/independent/desktop-${n}.png`})};
const click=async name=>{await p.getByRole('button',{name,exact:true}).click();await p.locator('.transition-layer.active').waitFor({state:'hidden'})};
await shot('01');await click('开始体验');await p.locator('textarea').fill('希望有更多自由时间，在安静的空间阅读与创作。');await shot('02');await click('构建我的世界');await p.getByRole('heading',{name:'你好，理想的世界'}).waitFor();await shot('03');await click('继续探索');await shot('04');await click('跳过，继续旅程');await shot('05');await click('再次与自己相遇');await p.locator('textarea').fill('慢慢来，保持热爱。');await shot('06');await click('收好此刻的心声');await click('愿意分享');await shot('07');console.log('Seven desktop screenshots captured.')}finally{await b.close()}
