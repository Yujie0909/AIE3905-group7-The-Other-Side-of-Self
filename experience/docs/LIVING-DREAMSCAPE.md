# Phase 2 · Living Dreamscape

在静态版本 `efe00e9` 上开发。未改动13个运行时背景文件、原图、字体配置、标题/正文字号、文案、布局、习惯数据、关键词及权重、AI模拟数据或分享判断。Page07仅给现有词语增加无样式文字span，以便字形小幅悬浮而点击按钮的边界保持稳定。

## 七页效果

| 页 | 主要持续动态 | 辅助层及交互 |
|---|---|---|
| 01 | 原图水面限定区域逐条纹理采样，金色倒影微移 | 入口11.3秒暖光呼吸、19.7秒低雾，开始按钮暖色悬停反馈 |
| 02 | 高光沿原有光带描摹曲线行进，周期11.3–16.7秒 | 较弱湖面反射；麦克风光晕只在SpeechRecognition.onstart后启用 |
| 03 | 阳光扩散、建筑边缘高光 | 建筑附近局部水波、轻微植物投影；原重新生成/调整/继续功能保留 |
| 04 | 右侧纱帘轮廓内的图像轻微形变，顶部固定、下部弯曲 | 11.7秒协调透射光、水面，习惯选中边框220ms柔和反馈 |
| 05 | 天空局部云纹理的慢速复合漂移 | 17.3/21.7秒远处建筑高光、夕阳与水面倒影；原播放状态/位置/5秒时长不变 |
| 06 | 镜面轮廓内19.1秒低强度反光 | 23.9秒薄雾与较弱水波；文字完全不参与动画 |
| 07 | 原图星点位置的错相呼吸、两条既有星轨的流动高光 | 18个词语字形约±2.2px横向、±3.5px纵向，9.7–17.6秒不同周期；湖面较弱反射 |

水面各页使用不同区域、反光中心和强度。水波与云/纱帘采用连续正弦的不同频率叠合，不按固定计时器跳回；光影循环首尾值相同。没有背景整图平移、缩放、全屏亮度动画、随机粒子或新背景图片。

## 动效架构和图层

- `src/motion/SceneMotion.tsx`：七个场景各自的原图坐标、光带/星轨路径、渐变、局部采样面。读取实际背景img的cover、object-position和缩放后边界，随视口与原有“查看细节”缩放适配；第06页沿用既有93%镜面相机。
- `src/motion/runtime.ts`：共用生命周期、局部Canvas采样、Web Animations管理。光影被预先包进有界的小SVG/HTML图层，避免动画整个SVG。光流优先使用CSS motion path作合成，高光而非整条新线；不支持时回退局部SVG描边。旧光影源隐藏，保留静态defs，最多只有当前页的实际图层运行。
- `src/motion/dreamscape.css`：透明、无矩形底板的局部层；水、云用椭圆羽化遮罩，纱帘使用轮廓遮罩。只有当前运行的小图层设置临时will-change，退出/暂停清除。
- `src/sceneResources.ts`：只新增读取已解码Image引用的接口。动效不创建背景请求，不下载新图片或视频，不修改预加载顺序。
- `src/pages/StaticLayout.tsx`、`Page01Welcome.tsx`：把环境层放在图景之上、文字和交互内容之下，pointer-events:none、aria-hidden。原图和现有UI保留。
- `src/pages/Page07Voices.tsx`：只包裹词语字形，原按钮命中区、字号、权重、坐标、数据及回调不变。
- `src/components.tsx`：增加仅用于视觉的语音active标志，由真实识别onstart触发，onend/onerror关闭；不改start/stop、语言、识别结果、提交或权限流程。没有实时音量数据，因此不绘制伪造音量。
- `src/pageTransition.tsx`：保留原预加载与360ms同步过渡；额外等待动效层初次准备完成。原生过渡复用浏览器旧帧，仅DOM回退拷贝Canvas以避免重复GPU读回；光影当前状态冻结、SVG片段引用（含引号/绝对URL）改名，保证无原生API时旧画面也完整。

场景状态为背景已解码→动效首帧准备→同步过渡→开始当前页循环。过渡中环境暂停。离开页面取消rAF/animations、断开observer和事件、清除临时图层并将Canvas宽高归零；底图缓存继续由原有系统复用。

## 性能控制

只创建当前页的光影与采样面，非首次批量创建七页动态资源。每页先将原图的局部水/云/纱帘裁成缓存小纹理，再逐条采样，不在每帧读取整张高清图；退出时释放裁片。普通采样水面最高900px宽；低配置/窄屏最高500px。第04页纱帘只采样右侧边缘，180×320，避开习惯玻璃按钮；第03页水波限定在按钮上方的水域，避免反复更新玻璃背景。云层500×141。新增唯一blur是纱帘轮廓小遮罩初始化时的一次3px处理，不是持续或全屏滤镜。

低配置、窄屏或Save-Data使用较低采样率；正常最高60Hz，纱帘页最高30Hz；经济模式水面24Hz、纱帘页12Hz，缓慢纹理移动仍连续，光影合成独立运行。检测连续30个调度间隔平均超过20ms时降低采样分辨率和频率，第07页减少次要星光的动态数量；保持场景主效果、文字和原始高清背景。没有为了性能改变背景编码/裁切。

监听document.visibilitychange及IntersectionObserver暂停不可见环境；prefers-reduced-motion提供完整静态页面，所有环境循环停下，词语恢复原位。浏览器的pause操作可能在下一帧完成，验证时等待这一帧稳定后再比对时钟。

## 实测

最终数据在审核页 `measurements.json` 与 `evidence.zip`。Linux Chromium、本地生产构建，1440×900，页面稳定1.5秒后按4秒窗口采样；静态基线单窗口，最终动态每页3窗口取调度帧率中位数，所有窗口和长帧保留在原始JSON；为覆盖高质量及自适应分支，测试给浏览器8核/8GiB能力提示，云硬件本身未改变。不是物理屏幕或GPU输出帧率测试。静态基线来自本阶段之前实际发布的生产构建。

| 页 | 静态基线 rAF/s | 最终动态 rAF/s | 动态绘制代码均值 ms/次 |
|---|---:|---:|---:|
| 01 | 59.8 | 53.5 | 0.590 |
| 02 | 57.3 | 53.8 | 0.673 |
| 03 | 60.0 | 60.0 | 0.244 |
| 04 | 44.9 | 59.8 | 0.549 |
| 05 | 52.8 | 60.0 | 0.449 |
| 06 | 60.0 | 59.0 | 0.466 |
| 07 | 59.8 | 55.3 | 0.256 |

云端采样（特别是静态基线单窗口）有明显调度波动（静态基线也有长帧），不得由这张表推论新增动态让网页变快。最终各页调度中位数约54–60fps；有窗口低至33.0fps，不能声称每页持续或实机60fps达标。绘制代码耗时不包含浏览器全部光栅化、合成及原有玻璃控件的成本。

同等冷缓存方法复测02→03，普通网络3轮中位数：进入可呈现状态760.7→831.0ms，完整事务1387.5→1356.7ms；慢网150ms/200KiB/s、同等停留12秒，完整事务1316.9→1489.7ms（新版3轮中位数）。均含原700ms模拟业务处理。背景/UI错配观测仍为0，CSS过渡仍360ms。快照及动态图层初始化有成本，详细原始时序和全部窗口见证据文件；不宣称绝对零开销。

七页桌面只使用原有13个背景URL，返回已访问页面新增图片传输0字节；窄屏只用7个。没有新背景、动态视频或额外字体请求。公开审核页视频不在网站体验入口加载。

## 验证方式

- 每页实际停留约12秒屏幕录制，七页截图；A/B截图实际像素发生变化。另检查WebKit、移动端的两时刻渲染。单张截图不作为动态证据。
- 镜面三行内容、位置在动态停留前后完全一致；1440×900、1280×720、390×844检查26个字形在安全区域内并实际绘制。静态字形逐个验证采用reduced-motion以避免把环境变化当作字形变化。
- 词语字形悬浮期间，18个按钮边界和字体大小保持一致，原选择/取消功能实际操作。
- 既有03生成/调整、04习惯选择、06确认/拒绝/返回编辑、退出与重置、快速连续点击、背景失败保留旧页面并重试、无原生API回退和reduced-motion流程均使用浏览器实际触发。
- 麦克风采用受控SpeechRecognition事件测试onstart/result/end、返回编辑后新节点重绑及停止时消除光晕。真正麦克风硬件/识别服务未在云环境测试。
- 动态切换reduced-motion后所有环境时钟停止、像素稳定；恢复后继续运行。Headless标签未真实进入hidden，因此用模拟visibilitychange/hidden验证暂停处理，未冒充实机后台测试。
- 构建与基础状态/隐私测试在发布时再次运行。

## 已知限制

没有独立透明纱帘、云、反射或植物阴影素材。纱帘是手工轮廓内的局部图像轻微形变，云是原图局部采样漂移，植物投影为程序化近似，镜面为低强度环境色光学层；均不是物理布料、体积云或三维反射模拟。星轨源只有栅格图，描摹曲线与原有线条近似对齐，没有添加参与者关系或新词语。

真实macOS/iOS Safari、Google Chrome应用、设备GPU帧率、真人实机主观审阅未在本环境完成；WebKit Linux不能等同于Safari实机。Chromium云代理对外部字体CSS有证书信任限制，保留项目原有字体回退；未下载替代字体。现有AI、关键词和分享仍沿用原先演示逻辑，本次没有接入真实AI或公共数据库。第05页原有预览文案/5秒播放控件按要求不改，持续环境动态独立于该控件。

## 修改文件清单

核心文件：`src/motion/SceneMotion.tsx`、`src/motion/runtime.ts`、`src/motion/dreamscape.css`、`src/sceneResources.ts`、`src/pages/StaticLayout.tsx`、`src/pages/Page01Welcome.tsx`、`src/pages/Page07Voices.tsx`、`src/components.tsx`、`src/pageTransition.tsx`。

验证脚本：新增`tests/dreamscape-page.mjs`、`tests/dreamscape-review.mjs`、`tests/dreamscape-performance.mjs`、`tests/dreamscape-lifecycle.mjs`、`tests/dreamscape-material.mjs`；更新既有`tests/consent-dialog.mjs`、`tests/mirror-rescue.mjs`、`tests/transition-performance.mjs`，分别支持环境动态、静态字形验收与正确等待切换完成。审核素材位于`public/review/dreamscape/`。

## 运行与复现

```sh
npm test
npm run build
npm run preview -- --port 5184
PAGE=4 node tests/dreamscape-page.mjs
RECORD=1 node tests/dreamscape-review.mjs
WIDTH=390 node tests/dreamscape-review.mjs
ENGINE=webkit node tests/dreamscape-review.mjs
LABEL=after node tests/dreamscape-performance.mjs
node tests/dreamscape-lifecycle.mjs
node tests/transitions.mjs
TRANSITION_MODE=fallback node tests/transitions.mjs
TRANSITION_MODE=reduced node tests/transitions.mjs
```

浏览器测试需要现有Playwright与浏览器运行环境；录屏使用系统ffmpeg。测量和录屏应分开运行。基线端口5191为本次保存的efe00e9生产文件，使用与新版一致的缓存头，不用开发构建作对照。

逐页恢复点：e19ec66（架构/01）、84a5fe1（02）、fbf3af7（03）、a3585be（04）、6949ec3（05）、497a487（06）、32cb669（07）。之后的提交包含最终合成与自适应优化及验收材料。
