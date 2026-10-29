import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[];
for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');await page.getByRole('heading',{name:'欢迎进入心流空间'}).waitFor();
 const background=await page.locator('.scene').elementHandle();
 await page.screenshot({path:`artifacts/01-${width}.png`});
 await page.getByRole('button',{name:'开始体验'}).click();await page.locator('textarea').fill('我希望有自由时间，在安静的空间阅读和创作。');await page.getByRole('button',{name:'构建我的世界'}).click();await page.getByRole('heading',{name:'你好，理想的世界'}).waitFor();
 assert.ok(await background.evaluate(el=>el.isConnected),'persistent background survives navigation');
 await page.getByRole('button',{name:'我想调整'}).click();await page.locator('textarea').fill('让窗外光线更柔和');await page.getByRole('button',{name:'确认调整'}).click();await page.getByRole('button',{name:'继续探索'}).click();
 await page.getByRole('button',{name:'作息与睡眠'}).click();await page.getByRole('button',{name:'兴趣与爱好'}).click();await page.getByRole('button',{name:'慢慢聊聊'}).click();await page.getByRole('button',{name:'晚睡晚起',exact:true}).click();await page.getByRole('button',{name:'下一项',exact:true}).click();await page.getByRole('button',{name:'阅读与学习',exact:true}).click();
 await page.screenshot({path:`artifacts/04-${width}.png`});await page.getByRole('button',{name:'看见另一种可能'}).click();await page.getByRole('heading',{name:'当一切趋于完美'}).waitFor();await page.getByRole('button',{name:'再次与自己相遇',exact:true}).click();await page.locator('textarea').fill('给自己一点自由，慢慢来。');await page.getByRole('button',{name:'收好此刻的心声'}).click();await page.getByRole('button',{name:'愿意分享',exact:true}).click();await page.getByRole('heading',{name:'你并不孤单'}).waitFor();await page.getByRole('button',{name:'自由',exact:true}).click();await page.screenshot({path:`artifacts/07-${width}.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');await page.getByRole('button',{name:'带着此刻的自己，继续前行'}).click();await page.getByRole('button',{name:'开始体验'}).click();assert.equal(await page.locator('textarea').inputValue(),'');
 await page.getByRole('button',{name:'退出体验'}).click();await page.getByRole('heading',{name:'欢迎进入心流空间'}).waitFor();
 console.log(`PASS ${width}×${height}: seven acts, adjustment, habits, consent, cloud, reset, exit`);await page.close();
}
assert.deepEqual(errors,[]);await browser.close();
