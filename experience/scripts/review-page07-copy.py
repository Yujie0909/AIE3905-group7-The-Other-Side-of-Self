from pathlib import Path
from PIL import Image
import json,shutil,hashlib,html
root=Path(__file__).resolve().parents[1];base=root/'artifacts/page07-readability';out=root/'public/review/page07-copy';out.mkdir(parents=True,exist_ok=True)
contrast=json.loads((base/'after/contrast.json').read_text());before=json.loads((base/'before/contrast.json').read_text());scope=json.loads((base/'scope-results.json').read_text());cases=[];figures=[]
for name in ['chromium-1920','chromium-1440','chromium-1280','chromium-390','webkit-1440','webkit-390']:
 data=json.loads((base/'after'/name/'results.json').read_text());cases.append(data)
 for kind in ['page-7','copy-detail']:
  Image.open(base/'after'/name/f'{kind}.png').convert('RGB').save(out/f'{name}-{kind}.jpg',quality=95,subsampling=0)
 figures.append(f'<figure><a href="{name}-page-7.jpg"><img loading="lazy" src="{name}-page-7.jpg" alt="{name}实际网页截图"></a><figcaption>{name} · <a href="{name}-copy-detail.jpg">正文局部</a></figcaption></figure>')
for phase in ['before','after']:
 for kind,target in [('page-7','page07'),('copy-detail','copy')]:shutil.copyfile(base/phase/'chromium-1920'/f'{kind}.png',out/f'{target}-{phase}-1920.png')
rows=[]
for c in contrast:
 rs=c['readings'];body=min(r['with-shadow']['pctAtLeast4_5'] for r in rs[:2]);end=rs[2]['with-shadow']['pctAtLeast4_5'];rows.append(f'<tr><td>{c["case"]}</td><td>{body:.2f}%</td><td>{end:.2f}%</td></tr>')
report='''# Page 07 正文可读性与艺术融合

本轮仅修改 Page07 的两段说明正文及三句结语。背景原图、标题、字体加载、字号、行距、文案、词云、流程轴、分享弹窗和业务代码不变。没有进入动态场景开发。

## 原因与取舍

浏览器实测：正文颜色原为 `rgb(225,231,250)`，结语为 `rgb(240,241,255)`，两者不透明度均为1、字重400。问题来自偏冷灰色的正文覆盖高亮云层和流光，原有单层阴影和0.18px细描边仍无法有效分离字形，并非整个文字容器透明度过低。

先只改暖白颜色和柔和双层阴影，实际截图与字形采样显示亮云区域仍有明显低对比点，随后加入限定在桌面正文附近的局部渐变。对照了不同强度的实际渲染，采用当前参数。没有压暗整张背景或右侧星空。

## 最终参数

- 主正文：`#F5F2ED`；结语：`#ECE9F2`。
- 文字不透明度：1；常规字重400；`-webkit-text-stroke:0`，移除旧细描边。
- 双层深蓝文字阴影：`0 0 1.5px rgba(24,35,67,.64), 0 2px 8px rgba(24,35,67,.16)`。无白色发光，无字体本体模糊。
- 字体族、字号、字距与原行距保持原值：主正文1.8，结语1.9。保留既有段落间距，避免移动手机词云。
- 桌面（宽度大于700px）局部辅助层：正文和结语各自的`::before`，`isolation:isolate`、`z-index:-1`、`pointer-events:none`。
- 辅助层范围：`inset:-1.4em -.5em -1.4em -15vw`；使用`ellipse closest-side at 50% 50%`径向渐变。深蓝色`rgb(24,35,67)`在0%为alpha .50，68%为.47，88%为.14，100%为0。层的所有内部边界均淡出为透明，没有边框、实色卡片、容器阴影或`backdrop-filter`。
- 手机不添加辅助渐变；其正文位于较暗星空，保留星空原始亮度。

标题的像素、字号和字重不变，仍是左侧主要焦点；正文使用暖白，结语使用略低明度的银白及原有留白形成层级。

## 实际视觉与对比度验证

使用实际浏览器DOM和已加载字体渲染白色字形遮罩，在字形核心像素（遮罩通道大于200）对应位置读取背景。提供两组数值：只有场景/局部渐变时，以及包含实际文字阴影形成的局部衬托时。没有用一个纯色背景代替照片，也没有把抗锯齿边缘当作完整笔画。

下表为包含实际阴影的局部背景抽样，统计字形核心位置达到4.5:1的比例。主正文列取两段中较低的一段。完整最小值、5百分位、中位数、无遮阴数值和采样量均在`measurements.json`。

| 引擎/宽度 | 主正文达到4.5:1 | 结语达到4.5:1 |
|---|---:|---:|
'''
for c in contrast:
 rs=c['readings'];report+=f'| {c["case"]} | {min(r["with-shadow"]["pctAtLeast4_5"] for r in rs[:2]):.2f}% | {rs[2]["with-shadow"]["pctAtLeast4_5"]:.2f}% |\n'
report+='''
1920×1080下，较弱的第二段由37.96%提升至99.62%，结语由48.58%提升至99.76%。这些是具体字形位置的栅格采样，不是完整WCAG认证。**没有声称每个像素都达到4.5:1**；极少量明亮星点覆盖处仍有较低值，全部保留在测量数据中。

Chromium实际检查1920×1080、1440×900、1280×720、390×844；Playwright WebKit检查1440×900、390×844。所有组合均保存真实全页截图和正文局部，检查无横向溢出。标题、正文、结语和词云的文字及几何参数保持一致。

## 保护范围验证

- Chromium 1920×1080：Page01–06六张前后完整截图逐像素相同，差异像素均为0。
- Chromium四个尺寸：Page07标题和流程轴截图区域差异为0，词云文字、权重、位置、大小与像素均不变；桌面右侧47%以后整片场景差异为0。
- 临时隐藏正文和其辅助渐变后，Page07整张截图前后差异为0，证明其余视觉区域保持原样。
- 检查辅助层矩形范围外的紧邻像素，差异为0；渐变没有越界或硬边。
- 词云点击、返回06、分享返回/拒绝/明确同意、会话内确认文字展示、流程轴回访保留输入、结束重置均实际操作通过。分享确认弹窗的文字、字体、背景及几何参数与修改前一致。
- `npm test`的原有3项状态/会话/习惯测试通过；`npm run build`通过。

## 修改文件与复现

实际产品源码仅两处：

1. `src/pages/Page07Voices.tsx`：增加本页专属样式导入。文案、数据数组和回调一字未改。
2. `src/pages/page07-copy.css`：所有规则限定到`.static-page-07`下的`.static-copy`或`.voices-static-ending`，没有修改全局body/h1/p或通用文字类。

验收文件：`tests/page07-readability.mjs`、`scripts/measure-page07-contrast.py`、`scripts/check-page07-scope.py`、`scripts/review-page07-copy.py`、`docs/PAGE07-COPY-READABILITY.md`、`public/review/page07-copy/*`。

本轮没有修改七张PNG、网页背景资产、字体配置、`App.tsx`、状态机、词云数据、底部导航或其他页面源码。开始时的基线为`5e5b692`。

启动`npm run dev -- --port 5210`；生产预览`npm run build && npm run preview -- --port 5211`。实际浏览器复验：`PHASE=after node tests/page07-readability.mjs`；可设置`ENGINE=webkit`。测量：`python3 scripts/measure-page07-contrast.py after`。范围对照需要保留`artifacts/page07-readability/before/`的真实基线截图。

公开审核页：`/review/page07-copy/`。原始1920截图：`page07-after-1920.png`；正文局部：`copy-after-1920.png`。所有图片来自实际浏览器，局部图为同一网页的截图区域。

## 限制与待审核

- 仓库仍未提供荆霄鹏行楷字体文件。本轮完整保留现有字体配置和加载方式，没有下载、替换或假称已部署该字体。
- Linux Chromium/Playwright WebKit不等同于macOS/iOS实机Chrome/Safari。
- 对比度仍有极少量低于4.5:1的星点采样，不宣称全点达标；视觉效果待用户审核。
- 本轮完成后停止，不进入动态阶段。
'''
(root/'docs/PAGE07-COPY-READABILITY.md').write_text(report);(out/'report.md').write_text(report)
measurements={'baseline':'5e5b692','before':before,'after':contrast,'scope':scope,'cases':cases,'sourceBackgroundSha256':hashlib.sha256((root/'background/page07.png').read_bytes()).hexdigest()};(out/'measurements.json').write_text(json.dumps(measurements,ensure_ascii=False,indent=2)+'\n')
(out/'index.html').write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page07 · 正文可读性审核</title><style>*{{box-sizing:border-box}}body{{margin:0;background:#eef1f6;color:#344760;font:16px/1.8 system-ui,sans-serif}}main{{max-width:1320px;margin:auto;padding:36px 22px 80px}}h1{{font-size:29px;line-height:1.4}}h2{{font-size:22px;margin-top:36px}}a{{color:#365e92}}.grid{{display:grid;grid-template-columns:1fr 1fr;gap:22px}}figure{{margin:0}}img{{display:block;width:100%;height:auto;border-radius:6px}}figcaption{{padding:8px 0;color:#52627b}}table{{border-collapse:collapse;width:100%}}th,td{{text-align:left;padding:10px;border-bottom:1px solid #647b9833}}.note{{max-width:1050px;color:#52627b}}@media(max-width:700px){{.grid{{grid-template-columns:1fr}}main{{padding:26px 16px}}}}</style><main><h1>Page 07 · 正文可读性与艺术融合</h1><p>仅调整左侧说明正文及结语。下面均为实际网页截图。</p><p><a href="../../?v=page07-copy">体验网站</a> · <a href="report.md">参数、修改文件与验证报告</a> · <a href="measurements.json">原始测量与范围对照</a></p><h2>完整页面 · 1920 × 1080</h2><div class="grid"><figure><a href="page07-before-1920.png"><img src="page07-before-1920.png" alt="修改前真实网页"></a><figcaption>修改前</figcaption></figure><figure><a href="page07-after-1920.png"><img src="page07-after-1920.png" alt="修改后真实网页"></a><figcaption>修改后 · 点击查看原始PNG</figcaption></figure></div><h2>左侧正文 · 局部对照</h2><div class="grid"><figure><a href="copy-before-1920.png"><img loading="lazy" src="copy-before-1920.png" alt="修改前正文局部"></a><figcaption>修改前</figcaption></figure><figure><a href="copy-after-1920.png"><img loading="lazy" src="copy-after-1920.png" alt="修改后正文局部"></a><figcaption>修改后</figcaption></figure></div><h2>实际字形位置的对比度抽样</h2><p>包含实际文字阴影形成的局部背景；主正文取两段中的较低值。未将照片简化成单一背景色。</p><table><tr><th>浏览器与宽度</th><th>主正文≥4.5:1</th><th>结语≥4.5:1</th></tr>{''.join(rows)}</table><p class="note">少量明亮星点覆盖处仍有低于4.5:1的采样；没有声称全点达标或完成WCAG认证。无遮阴数值、最小值和采样方式详见报告。其他六页1920截图像素差为0；标题、流程轴和词云对照也为0。</p><h2>其他尺寸与引擎的真实截图</h2><div class="grid">{''.join(figures[1:])}</div><p class="note">字体配置、字号、字距与原有排版未变。项目仍缺荆霄鹏行楷文件，本次没有下载或替换字体。未进入动态阶段。</p></main></html>''')
print('Packaged actual Page07 screenshots, contrast measurements and unchanged-page proof')
