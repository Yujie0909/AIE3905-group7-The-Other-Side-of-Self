"""Package actual Page02 browser captures; never edits any experience artwork."""
from pathlib import Path
import json
import shutil
import subprocess
import zipfile
import html
from PIL import Image
import numpy as np

app = Path(__file__).resolve().parents[1]
artifacts = app / 'artifacts/page02-ribbon'
public = app / 'public/review/page02-ribbon'
public.mkdir(parents=True, exist_ok=True)
measurements = {'cases': []}
sections = []
for name in ['chromium-1440', 'chromium-1920', 'chromium-390', 'webkit-1440', 'webkit-1920']:
    source = artifacts / name
    case = json.loads((source / 'results.json').read_text())
    on = np.asarray(Image.open(source / 'ribbon-on.png').convert('RGB')).astype(int)
    off = np.asarray(Image.open(source / 'ribbon-off.png').convert('RGB')).astype(int)
    coverage = np.asarray(Image.open(source / 'ribbon-mask.png').convert('RGBA'))[:, :, 3] > 0
    delta = np.max(np.abs(on-off), axis=2)
    case['isolatedRibbonPixels'] = {
        'changeOver3': int((delta > 3).sum()),
        'changeOver12': int((delta > 12).sum()),
        'maxChannelChange': int(delta.max()),
        'changeOutsideCurveOver3': int(((delta > 3) & ~coverage).sum()),
    }
    assert case['isolatedRibbonPixels']['changeOver12'] > 100
    assert case['isolatedRibbonPixels']['changeOutsideCurveOver3'] == 0
    initial = np.asarray(Image.open(source/'t0.png').convert('RGB')).astype(int)
    differences = []
    for t in [3, 6]:
        current = np.asarray(Image.open(source/f't{t}.png').convert('RGB')).astype(int)
        diff = np.max(np.abs(current-initial), axis=2)
        entry = {'seconds': t, 'curvePixelsOver8': int(((diff > 8) & coverage).sum())}
        assert entry['curvePixelsOver8'] > 400
        # Explicit left title/copy sample boxes; these do not include the h1's
        # empty full-width CSS layout area, where the original ribbon lives.
        if name == 'chromium-1440':
            entry['titleSampleChangedPixels'] = int((diff[130:260, 70:650] > 0).sum())
            entry['copySampleChangedPixels'] = int((diff[300:370, 75:760] > 0).sum())
            assert entry['titleSampleChangedPixels'] == entry['copySampleChangedPixels'] == 0
        differences.append(entry)
    case['frameDifferences'] = differences
    figures = []
    for t in [0, 3, 6]:
        Image.open(source/f't{t}.png').convert('RGB').save(public/f'{name}-t{t}.jpg', quality=94, subsampling=0)
        figures.append(f'<figure><a href="{name}-t{t}.jpg"><img loading="lazy" src="{name}-t{t}.jpg" alt="{name}，约 {t} 秒实际截图"></a><figcaption>t = {t} 秒</figcaption></figure>')
    sections.append(f'<details><summary>{html.escape(name)} · {case["width"]} × {case["height"]}</summary><div class="frames">{"".join(figures)}</div></details>')
    measurements['cases'].append(case)

case = measurements['cases'][0]
crop = (600, 0, 1440, 470)
for t in [0, 3, 6]:
    Image.open(artifacts/'chromium-1440'/f't{t}.png').crop(crop).convert('RGB').save(public/f'sky-t{t}.jpg', quality=95, subsampling=0)
shutil.copyfile(artifacts/'video/page02-ribbon.mp4', public/'page02-ribbon.mp4')
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(public/'page02-ribbon.mp4'), '-vf', 'crop=746:418:534:0', '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-movflags', '+faststart', str(public/'page02-ribbon-detail.mp4')], check=True)
measurements['performance'] = json.loads((artifacts/'performance.json').read_text())
measurements['recording'] = json.loads((artifacts/'video/results.json').read_text())
(public/'measurements.json').write_text(json.dumps(measurements, ensure_ascii=False, indent=2))
with zipfile.ZipFile(public/'evidence.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    archive.write(public/'measurements.json', 'measurements.json')
    for file in sorted(artifacts.glob('*-*/results.json')):
        if file.parent.name in [c['engine']+'-'+str(c['width']) for c in measurements['cases']]:
            archive.write(file, file.relative_to(artifacts))
    for file in [artifacts/'performance.json', artifacts/'video/results.json', artifacts/'review-playback.json', artifacts/'fallback.json']:
        archive.write(file, file.relative_to(artifacts))
    for relative in ['transitions/chromium-native/results.json', 'transitions/chromium-fallback/results.json', 'transitions/webkit-native/results.json', 'consent-dialog/results.json']:
        archive.write(app/'artifacts'/relative, 'regressions/'+relative)

perf = measurements['performance']
counts = [d['curvePixelsOver8'] for d in case['frameDifferences']]
video = measurements['recording']
report = f'''# Page02 金色光带纠错实施与验收

本轮只修复 Page02，不将其视作整个 Phase2 已通过艺术验收。

## 原因与实施

旧实现已经挂载并运行：三个短椭圆光点沿 CSS motion path 移动，宽约86屏幕像素、高约10像素、峰值不透明度约0.58（1440×900实测）。原图丝带本来很亮，光点对比不足；旧曲线也未精确沿主要折线延伸。未发现被背景盖住或计时器未运行。

本轮删除 Page02 的旧三个光点入口，替换为专用 SVG 图层。沿实际1672×941背景描摹上升折带、斜向折带和右侧折带。每条包含一层低亮度固定载体、一组柔和的移动高光及窄范围的光晕；没有新背景，没有随机粒子，没有整图平移、缩放或亮度动画。

沿SVG曲线使用浏览器原生CSS motion path / Web Animations。每条曲线上11段互相重叠的柔软渐变构成一条连续高光，段与段保持固定弧距和相位，不是随机粒子。周期分别为10.4、11.6、9.2秒。只有高光沿真实曲线流动；接近开放端点时仅高光渐隐，再从另一端进入。原有场景生命周期统一启停全部动画，没有新增requestAnimationFrame，也没有固定延迟切页。

调试发现逐帧更新SVG渐变与遮罩的重绘成本较高，移除遮罩后仍有不稳定的长帧。最终版本彻底移除逐帧SVG渐变更新：SVG载体保持静态，沿路径移动的小渐变只栅格化一次，由浏览器合成位置和透明度。只在可见/切换期间提升这些局部高光层，没有全屏滤镜或动态模糊。旧浏览器若不支持motion path，回退为沿同一SVG路径移动的虚线高光；旧版浏览器实机尚未验证。

坐标使用现有 SceneMotion camera：读取真实img边界、object-fit:cover比例、object-position与裁切偏移。SVG图层和原图共用同一个照片坐标变换。测试比对的是变换矩阵（位移差小于0.1屏幕像素），不代表手工描摹的曲线达到逐像素素材分割精度。

光流在背景上方、文字与交互下方，沿用 pointer-events:none。后台、离页、导航和 reduced-motion 继续由原场景生命周期处理；没有新增独立计时器或图片请求。离页取消原生动画并移除局部图层。

## 实际修改文件

- `src/motion/Page02LightRibbon.tsx`：专用SVG曲线、稳定载体、相互重叠的路径高光与兼容回退。
- `src/motion/SceneMotion.tsx`：仅替换 page===2 分支并挂载新组件。
- `src/motion/runtime.ts`：注册Page02原生路径动画，保留reduced-motion前后的相对相位，沿用原有启停和清理。
- `tests/page02-ribbon.mjs`：实际0/3/6秒截图、位置/像素对比所需掩膜、暂停、离页、返回、业务生成、reduced-motion。
- `tests/page02-ribbon-record.mjs`：实际浏览器录屏。
- `tests/page02-ribbon-performance.mjs`：单独运行的持续帧调度与请求测量。
- `scripts/review-page02-ribbon.py`：根据真实截图计算差异并生成审核页面。
- `docs/PAGE02-RIBBON-REPAIR.md`、`public/review/page02-ribbon/*`：本报告、实际截图与录屏。

未改动背景、字体CSS、页面文案、字号、Page02输入/麦克风/玻璃弹窗、其他六页的动效参数或页面同步切换代码。最终构建CSS仍与上版具有相同指纹。

## 实际验证

Chromium：1440×900、1920×1080、390×844。WebKit：1440×900、1920×1080。五组均实际点击首页进入Page02，等待背景、字体与导航稳定后，按约0、3、6秒截图。时间与位置保存在measurements.json，不以定义了动画作为验收依据。

1440×900截图，在曲线覆盖范围内，相对t=0，t=3与t=6分别有{counts[0]}、{counts[1]}个像素的最大色通道变化大于8。左侧标题抽样区(70,130)-(650,260)、正文抽样区(75,300)-(760,370)变化均为0。DOM中的标题、正文、输入框位置在五组时间帧中保持一致。移动端保留原cover裁切，光带会经过正文后方，文字依然在最上层；没有为动效移动文案。

冻结环境后仅开关光带，五组截图的显著变化均位于实际SVG曲线34px宽的覆盖范围，范围外变化为0。主页面背景未整体闪烁。图层是透明的曲线笔触，没有矩形底板、背景模糊或遮罩边界。

五组测试均检查：后台处理器暂停与恢复、业务生成后进入Page03、离页停止旧图层、返回Page02没有重复图层且保留文字输入、动态切换reduced-motion后保持静态。后台测试采用模拟document.hidden事件，未声称完成操作系统级后台实测。

实际录屏采集约{video['recordedSeconds']:.2f}秒，共{video['frames']}个真实浏览器帧；编码为30fps不代表硬件实际显示30fps。局部视频只裁切同一份录屏，未添加合成运动。

独立运行三轮4秒性能采样，云端Linux Chromium帧调度中位数{perf['medianRafPerSecond']:.1f}次/秒；原始窗口、最大帧间隔与Canvas采样统计全部保留。不能据此声称实机稳定60fps或实机GPU帧率。持续采样新增图片请求为{perf['requestsDuringMeasurement']}，没有为光流加载任何新图像。

`npm test`与`npm run build`通过。本轮既有回归也通过：Chromium原生与DOM回退过渡、WebKit原生过渡，均覆盖七页业务流程、快速点击、资源未就绪时保留旧页、失败重试、分享拒绝/同意及会话重置。1920、1366、390、320宽度实际触发Page02/04/06玻璃弹窗，与原样式/文案/字体/几何基线一致。

## 预览与复现

`npm run dev -- --port 5190`，打开Vite提供的本地地址，点击「开始体验」进入02。生产构建可运行 `npm run preview -- --port 5200`；以 `STATIC_BASE_URL=http://localhost:5200 node tests/page02-ribbon.mjs`复现截图与功能检查，WIDTH=1920或390切换尺寸，ENGINE=webkit使用WebKit。

公开审核：`/review/page02-ribbon/`。公开体验：网站原地址，点击开始进入02。

## 尚未验证与视觉限制

- Linux Chromium和Playwright WebKit不等同于macOS/iOS上的实机Chrome/Safari；实机GPU、长时间内存曲线及真实麦克风硬件未复验。
- 光带路径按原图描摹，呈现沿既有丝带的照明传播；不对原照片细纹做物理流体模拟。没有分层丝带alpha素材，细小分叉并未逐根重建。
- 手机屏幕延用原有cover裁切，只能看到丝带的一部分。没有为动效改变已有构图。
- 截图中标题区仍保留既有静态背景的局部亮度接缝；单独开关光流未改变该区域。本轮依照限制，没有改动背景或标题合成，也不声称已修复这一历史问题。
'''
(app/'docs/PAGE02-RIBBON-REPAIR.md').write_text(report)
(public/'report.md').write_text(report)
frames = ''.join(f'<figure><a href="sky-t{t}.jpg"><img src="sky-t{t}.jpg" alt="金色光带约{t}秒截图"></a><figcaption>t = {t} 秒 · 实际截图局部</figcaption></figure>' for t in [0, 3, 6])
(public/'index.html').write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page02 · 金色光带实际验收</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#111d29;color:#f2e9d8;font:16px/1.8 system-ui,sans-serif}}main{{max-width:1280px;margin:auto;padding:36px 22px 80px}}h1{{font-size:32px;line-height:1.4}}h2{{font-size:23px;margin-top:38px}}p{{max-width:1050px;color:#d5d9da}}a{{color:#f2d396}}video{{display:block;width:100%;max-height:78vh;background:#101b26;border:1px solid #ffffff26;border-radius:12px;margin:18px 0}}.frames{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}figure{{margin:0}}img{{display:block;width:100%;height:auto;border-radius:6px}}figcaption{{font-size:14px;color:#c1c9ce;padding:8px 0}}details{{border-top:1px solid #ffffff26;padding:18px 0}}summary{{cursor:pointer;margin-bottom:18px}}table{{width:100%;border-collapse:collapse}}td,th{{border-bottom:1px solid #ffffff22;text-align:left;padding:10px}}.note{{border-left:2px solid #d5b780;padding-left:16px}}@media(max-width:700px){{.frames{{grid-template-columns:1fr}}h1{{font-size:26px}}}}
</style><main><h1>Page02 · 沿金色丝带流动的光</h1><p>本轮只修复「02 想象」。下方是实际浏览器录屏与约0、3、6秒的截图。其他六页未在本轮重新开发。</p><p><a href="../../?v=page02-ribbon">打开网站 · 点击开始进入02</a>　·　<a href="report.md">实施报告／修改文件</a>　·　<a href="measurements.json">原始测量</a>　·　<a href="evidence.zip">下载检查数据</a></p>
<h2>实际完整页面录屏 · 约{video['recordedSeconds']:.1f}秒</h2><video controls playsinline preload="metadata" poster="chromium-1440-t0.jpg"><source src="page02-ribbon.mp4" type="video/mp4"></video><p>原始浏览器采集，不以单张截图证明动画。下方局部视频仅裁切同一段录屏，方便观察高光沿曲线的位置变化。</p>
<video controls playsinline preload="metadata" poster="sky-t0.jpg"><source src="page02-ribbon-detail.mp4" type="video/mp4"></video>
<h2>不同时间的天空局部</h2><div class="frames">{frames}</div>
<h2>实测结果</h2><table><tr><th>检查</th><th>结果</th></tr><tr><td>t0→t3／t0→t6 曲线区域明显变化像素</td><td>{counts[0]}／{counts[1]}（色通道差&gt;8）</td></tr><tr><td>左侧标题／正文抽样区变化像素</td><td>0／0（1440×900，抽样范围见报告）</td></tr><tr><td>单独开关光流：曲线覆盖范围外变化</td><td>五组均为0</td></tr><tr><td>布局坐标、进入Page03、离页清理、返回与reduced-motion</td><td>五组通过</td></tr><tr><td>持续运行新增图片请求</td><td>0</td></tr><tr><td>云端rAF调度中位数</td><td>{perf['medianRafPerSecond']:.1f}次/秒；不等同实机GPU帧率</td></tr></table>
<h2>各尺寸完整截图</h2>{''.join(sections)}
<p class="note">限制：已检查Linux Chromium与Playwright WebKit，尚未完成实机Safari／Chrome和硬件麦克风测试。手机保留原有cover裁切。轨迹按静态照片描摹，未重建每一根细小分叉。未宣称整个Phase2已经通过艺术验收。</p></main></html>''')
print(f'Packaged {len(measurements["cases"])} actual capture sets; {sum(p.stat().st_size for p in public.rglob("*") if p.is_file())/1024/1024:.1f} MiB')
