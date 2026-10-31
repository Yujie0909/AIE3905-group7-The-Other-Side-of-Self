"""Package real browser captures, never substitutes source art for screenshots."""
from pathlib import Path
from PIL import Image
import json,shutil,html,hashlib,zipfile
root=Path(__file__).resolve().parents[1];a=root/'artifacts/final-scenes';out=root/'public/review/final-static';out.mkdir(parents=True,exist_ok=True)
cases=[];panels=[]
for name in ['chromium-1920','chromium-1440','chromium-1280','chromium-390','webkit-1440','webkit-390']:
 case=json.loads((a/name/'results.json').read_text());
 for entry in case['pages']:
  n=entry['page'];expected=json.loads((root/'docs/final-background-assets.json').read_text())[n-1];assert f'/page{n:02}-' in entry['background'];assert entry['native']==[expected['width'],expected['height']]
 cases.append(case)
 figures=[]
 for n in range(1,8):
  src=a/name/f'page-{n}.png';jpg=f'{name}-page-{n}.jpg';Image.open(src).convert('RGB').save(out/jpg,quality=94,subsampling=0)
  if name=='chromium-1920':shutil.copyfile(src,out/f'page-{n}-1920.png')
  figures.append(f'<figure><a href="{jpg}"><img loading="lazy" src="{jpg}" alt="{name}第{n}页真实网页截图"></a><figcaption>Page {n:02} · {case["width"]} × {case["height"]}</figcaption></figure>')
 panels.append(f'<details><summary>{html.escape(name)}：七页完整截图</summary><div class="grid">{"".join(figures)}</div></details>')
for id in ['02','04','07-consent']:
 for kind in ['', '-detail']:
  shutil.copyfile(a/'chromium-1920'/f'dialog-{id}{kind}.png',out/f'dialog-{id}{kind}.png')
for name in ['chromium-1920','chromium-390']:
 shutil.copyfile(a/name/'mirror-detail.png',out/f'{name}-mirror-detail.png')
assets=json.loads((root/'docs/final-background-assets.json').read_text());network=json.loads((a/'network.json').read_text());measurements={'cases':cases,'assets':assets,'network':network,'checkpoints':{'previousSite':'825cf235ed356784282042db2b58503c695107ef','interruptedMotionWip':'75880c8'},'screenshotHashes':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in out.glob('page-*-1920.png')}}
(out/'measurements.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n');shutil.copyfile(root/'docs/FINAL-CLEAN-STATIC.md',out/'report.md')
with zipfile.ZipFile(out/'verification-data.zip','w',zipfile.ZIP_DEFLATED) as z:
 z.write(out/'measurements.json','measurements.json');z.write(out/'report.md','report.md')
 for name in ['chromium-1920','chromium-1440','chromium-1280','chromium-390','webkit-1440','webkit-390']:z.write(a/name/'results.json',name+'/results.json')
 for rel in ['transitions/chromium-native/results.json','transitions/chromium-fallback/results.json','transitions/webkit-native/results.json']:
  p=root/'artifacts'/rel
  if p.exists():z.write(p,'regressions/'+rel)
thumbs=''.join(f'<figure><a href="page-{n}-1920.png"><img loading="lazy" src="chromium-1920-page-{n}.jpg" alt="第{n}页真实网页截图"></a><figcaption>Page {n:02} · <a href="page-{n}-1920.png">原始 PNG 截图</a></figcaption></figure>' for n in range(1,8))
dialogs=''.join(f'<figure><a href="dialog-{id}.png"><img loading="lazy" src="dialog-{id}.png" alt="{id}实际操作触发的弹窗"></a><figcaption>{label} · <a href="dialog-{id}-detail.png">局部</a></figcaption></figure>' for id,label in [('02','02 输入后的选择'),('04','04 习惯进一步选择'),('07-consent','进入07前的分享确认（实际触发于06）')])
rows=''.join(f'<tr><td>{r["name"]}</td><td>{r["bootstrapDecodedMs"]:.0f}ms</td><td>{len(r["requests"])}</td><td>{len(r["visibleIncomplete"])}</td></tr>' for r in network)
(out/'index.html').write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>心流空间 · Phase 1 静态审核</title><style>*{{box-sizing:border-box}}body{{margin:0;background:#eef1f6;color:#334760;font:16px/1.8 system-ui,sans-serif}}main{{max-width:1420px;margin:auto;padding:42px 24px 80px}}h1{{font-size:30px;line-height:1.4}}h2{{font-size:22px;margin-top:38px}}a{{color:#375e91}}.grid{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}}figure{{margin:0}}img{{display:block;width:100%;height:auto;border:1px solid #536b8a33;border-radius:8px}}figcaption{{padding:8px 0;color:#52627a}}details{{border-top:1px solid #536b8a44;padding:20px 0}}summary{{cursor:pointer;margin-bottom:20px}}table{{border-collapse:collapse;width:100%}}td,th{{text-align:left;padding:12px;border-bottom:1px solid #536b8a33}}.note{{max-width:1080px;color:#52627a}}@media(max-width:760px){{.grid{{grid-template-columns:1fr}}main{{padding:26px 16px}}h1{{font-size:25px}}}}</style><main><h1>心流空间 · 七张净图的静态视觉适配</h1><p>所有截图来自实际网页。七张审核通过的PNG原图保留原样；本轮不启用环境动画。</p><p><a href="../../?v=clean-static-phase1">打开实际网站</a>　·　<a href="report.md">实施报告／修改文件／限制</a>　·　<a href="measurements.json">浏览器与资产实测</a>　·　<a href="verification-data.zip">下载检查数据</a></p><p class="note">目标字体文件与网页授权尚未提供，保留项目现有字体配置。AI、播放器与词云维持原项目的演示模式；没有新增真实生成服务或共享数据库。请逐页审核静态版，确认后再进入动态制作。</p><h2>1920 × 1080 · 七页完整网页</h2><div class="grid">{thumbs}</div><h2>实际交互触发的玻璃弹窗</h2><div class="grid">{dialogs}</div><h2>水镜寄语 · 桌面与手机局部</h2><div class="grid"><figure><a href="chromium-1920-mirror-detail.png"><img loading="lazy" src="chromium-1920-mirror-detail.png" alt="桌面镜面寄语"></a></figure><figure><a href="chromium-390-mirror-detail.png"><img loading="lazy" src="chromium-390-mirror-detail.png" alt="手机镜面寄语"></a></figure></div><h2>其他尺寸与引擎</h2>{''.join(panels)}<h2>首次加载实测</h2><p>本地生产预览；慢网为250KiB/s、120ms延迟。表中解码时间来自导航起点，不代表所有设备或线上网络。首屏稳定后只预载下一页，没有同时请求七张背景。</p><table><tr><th>场景</th><th>首页背景解码</th><th>观察到的背景请求</th><th>未完成却可见的帧</th></tr>{rows}</table><p class="note">已检查Linux Chromium与Playwright WebKit，未将其称为macOS/iOS实机Safari测试。手机除星空页外保留独立美术展示区，控件在下方可滚动阅读；06的展示区聚焦水镜，以保证三行寄语完整。未安装或替换字体；真实麦克风硬件仍待实机检验。</p></main></html>''')
print('Packaged',len(cases),'browser-size cases;',sum(p.stat().st_size for p in out.rglob('*') if p.is_file())/1024**2,'MiB')
