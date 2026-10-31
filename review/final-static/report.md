# 心流空间：新版净图 Phase 1 静态视觉重构

本轮只接入七张审核通过的净图、重排静态 UI 并保留既有交互。没有启用环境动效；既有页面间同步交融切换继续保留。完成后停在静态审核，不自动进入 2.5D 阶段。

## 文件核验与检查点

实际网站根目录为 `/workspace/AIE3905-group7-The-Other-Side-of-Self/experience`，入口 `index.html` → `src/main.tsx` → `src/App.tsx`。用户所说 `Github/experience/background` 对应此仓库的 `experience/background/`。七张文件刚上传到 GitHub 提交 `825cf23`，本地通过 fast-forward 同步，没有创建第二个网站。

| 页面 | 已审核 PNG（相对于网站根目录） | 原始尺寸 | 网页资源 |
|---|---|---|---|
| 01 | `background/page01.png` | 1670×942 | `src/assets/final-backgrounds/page01.webp` |
| 02 | `background/page02.png` | 1672×941 | `src/assets/final-backgrounds/page02.webp` |
| 03 | `background/page03.png` | 1672×941 | `src/assets/final-backgrounds/page03.webp` |
| 04 | `background/page04.png` | 1672×941 | `src/assets/final-backgrounds/page04.webp` |
| 05 | `background/page05.png` | 1672×941 | `src/assets/final-backgrounds/page05.webp` |
| 06 | `background/page06.png` | 1672×941 | `src/assets/final-backgrounds/page06.webp` |
| 07 | `background/page07.png` | 1671×941 | `src/assets/final-backgrounds/page07.webp` |

七张原 PNG 逐张检查，未发现已嵌入的标题、按钮、流程轴或旧镜面寄语。转换前后 SHA-256 相同，PNG 未裁剪、调色、修图或重绘。尺寸、字节数与 SHA 完整记录在 `docs/final-background-assets.json`。旧参考图和旧去字图保留在仓库供回退，本次运行时不再显示或下载它们。

可恢复检查点：

- `checkpoint/pre-clean-static-20261031` → `825cf235ed356784282042db2b58503c695107ef`：旧网站与刚上传的七张 PNG。可在独立 worktree 检出查看旧版。
- `checkpoint/page02-environment-wip-20261031` → `75880c8`：被本次新任务中止的 Page02 动效草稿。该草稿仍有 WebKit 性能问题，单独保存且没有部署。本轮静态源码不依赖它。

## 逐页适配

| 页面 | 静态布局与视觉适配 |
|---|---|
| 01 | 标题、英文副题、正文与开始按钮位于左侧；右侧镜门及台阶留空。以雾蓝灰文字配合晨光，不叠加暗色遮罩。 |
| 02 | 标题与正文放入左上天空，主要金色丝带保留在中右区域。语音与输入放在中下部水域；实际输入完成后的选择面板为居中玻璃弹窗。 |
| 03 | 标题、正文和三个同宽操作按钮移至中央天空区域，避开左侧卧榻、茶几和右侧夕阳。保留重新生成、调整、返回描述、细节视图与继续探索。 |
| 04 | 七个习惯胶囊在左侧双列排列，麦克风在其右下方，文本输入位于左侧下方，右侧沙发与茶几保持完整。进一步选择面板与02共享玻璃样式。 |
| 05 | 标题及正文位于左侧天空。播放器、状态说明及继续按钮在桌面主体上方分层排列；进度条提高细线对比度，底部导航按深色水面采用浅色文字。 |
| 06 | 标题、引导、自述输入与麦克风集中左侧。寄语按新图的蓝色镜面坐标重新测量；三行 SVG 文字、低饱和蓝灰墨色、轻微斜率、multiply 混合，不使用卡片或模糊。 |
| 07 | 左侧标题、说明与独立三句结语，右侧保留18个词的原内容和权重。文字直接叠在星空上，没有词条矩形；保留显式演示数据标记与点击功能。 |

七页均使用同一底部流程轴：01 开始、02 想象、03 理想、04 现状、05 变化、06 自我、07 尾声。统一轨道位置、节点与激活方式，没有恢复左上角独立页码。文案与全站字体配置保留；桌面标题、正文字号基准未重设。部分控件和手机布局按可用空间适配。

手机采用独立响应式排版：01–05 将完整画面放在顶部，阅读与交互放在下方，避免把横幅场景和所有控件挤进一幅纵向裁切图。06 采用700px高的水镜展示区，聚焦镜面，UI在下方；这会裁去左侧部分远景，但保护镜面及三行寄语。07 继续以星空铺满页面，词云在说明下方，保留大小层级。手机页面可滚动；完整网页截图包含底部流程轴。

## 分层与生命周期

- Scene Background：现有 `useSceneBackground` 仅显示对应新净图。移除 `StaticLayout` 与 `BackgroundFallback` 对旧 `ReferenceArtwork` 修补图层的挂载。
- Motion Layers：`SceneLayers.tsx` 提供空的 `MotionLayers` 承载层、背景就绪信号及 visible/hidden/reduced/transitioning/disposed 状态。没有创建 Canvas、环境动画、持续计时器或渲染循环。该就绪信号继续满足现有原子化页面切换机制。
- UI Overlay：独立 `UIOverlay` 包含文字、输入、原有事件处理、弹窗、词云与流程轴。动效承载层不拦截交互。原语音、数据与状态管理没有迁入视觉层。

旧标题去字遮罩、全场景暗色渐变和旧环境动画不参与本轮渲染。没有用全局 `div { background:transparent }` 破坏弹窗。玻璃弹窗共用半透明浅蓝表面、14px局部 backdrop blur、细边与柔和阴影；没有纯黑全屏遮罩。分享确认保留其真实位置：**在06提交自述后触发，用户选择后进入07**；没有为匹配章节名称擅自更改业务流程。

## 性能与资产

网页衍生图使用 WebP near-lossless60，保留原始尺寸、比例与 ICC 信息；实测每个 RGB 通道的最大变化不超过2/255，PSNR为47.52–48.73dB。七图总计从17,922,596字节缩至9,486,252字节，减少47.1%。这不是对 PNG 原始文件的修改。

首页内联预加载与启动图更新为新01。仍沿用原资源状态、URL缓存、`Image.decode()`、下一页空闲预载、真实就绪后原子提交和失败重试。首页完成后只准备02；不同时请求七张图。首次图片尚未完整解码时不可见，背景准备完毕才整体呈现。Vite 使用版本化文件名；GitHub Pages 的缓存期限由平台控制，不能声称配置了平台不支持的一年 immutable 缓存。

本地生产预览、1920×1080、Chromium实测（单次冷／暖／慢网，未录屏以减少测量干扰）：

| 场景 | 首页背景解码（从导航开始） | 稳定绘制标记 | 观察到的背景请求 | 未完成却可见的帧 |
|---|---:|---:|---:|---:|
| 冷缓存 | 407.7ms | 510.1ms | 2（01+预载02） | 0 |
| 暖缓存 | 327.1ms | 502.8ms | 2（缓存/验证） | 0 |
| 慢网冷缓存：250KiB/s、120ms | 5746.1ms | 5775.2ms | 2（01+预载02） | 0 |

慢网需要传输新首页的1.28MB，不能承诺零等待；测试没有用额外延时或加载动画掩盖。暖缓存观察到254字节网络开销，不能写成绝对0字节。请求、优先级、缓存和时间详情在审核页 `measurements.json`。

## 实际验证

- `npm test`：原有3项状态图、会话重置及七类习惯测试通过；`npm run build`：TypeScript与Vite通过。
- `tests/final-scenes.mjs`：Chromium的1920×1080、1440×900、1280×720、390×844，以及Playwright WebKit的1440×900、390×844。共42个页面/尺寸组合，均实际进入七页、截取完整网页；静置前后截图相同、无运行环境动画、无Canvas/旧背景合成、无横向溢出。
- 六组都实际触发02澄清、04习惯进一步选择、进入07前的分享确认弹窗，检查透明背景、模糊、可读文字及视口边界，并保存全页与局部截图。
- 六组检查06三行全文与句号、行边界均位于新镜面安全区内；没有横向或纵向裁剪。桌面与手机局部截图另存供审阅。
- 六组检查重新生成版本、实际调整输入、习惯选择状态、手动播放/暂停/进度、词云点击、分享返回/拒绝/同意、回访保留输入与退出重置。最后针对03按钮与夕阳的间距、04跳过按钮的点击区域、05控制区和深水面导航再次截图与操作复验。窄桌面04轨道空白曾拦截跳过按钮，已调整间距并仅让导航节点接收点击。
- `tests/transitions.mjs`：Chromium原生及DOM回退、WebKit现有切换路径，检查全流程、快速连点、背景未就绪保留旧页、资源失败与重试、分享及会话重置。故障注入匹配新净图URL，没有再拦截已退役的旧artwork资源。
- `tests/speech-regression.mjs`：成功、拒绝和不支持的浏览器接口模拟，确认结果仍进入原输入框、文字仍可提交。测试明确等待页面切换结束，避免把事务锁中的临时禁用误报成功能故障。没有假装完成真实麦克风硬件测试。
- `tests/final-scenes-network.mjs`：清缓存、暖缓存及受控慢网；检查只有01与下一页02请求，没有不完整图片可见。

原始截图与测量保存在 `artifacts/final-scenes/`。公开审核页 `/review/final-static/` 提供七张1920原始PNG网页截图、不同尺寸截图、三个实际弹窗、06镜面局部、报告及原始JSON。审核页的缩略JPEG仅压缩真实浏览器截图，不是背景净图。

## 修改文件

- `index.html`：新首页预加载、启动底色与响应式启动图。
- `src/backgroundAssets.ts`：七张新净图映射，不再使用旧图修补合成。
- `src/assets/final-backgrounds/page01.webp`–`page07.webp`：网页衍生资源。
- `src/main.tsx`：加载本轮局部视觉样式。
- `src/pages/final-scenes.css`：逐页布局、明暗文字、输入、导航、玻璃弹窗与手机布局。
- `src/pages/SceneLayers.tsx`：独立的UI和空动效承载结构、未来生命周期状态。
- `src/pages/StaticLayout.tsx`、`Page01Welcome.tsx`、`BackgroundFallback.tsx`：接入分层并退出旧背景/旧动效。
- `src/pages/MirrorInscription.tsx`：新镜面安全区、静态墨色及文字适配。
- `src/pages/Page07Voices.tsx`：仅增加移动端词云布局所需的CSS变量；词条内容、原数据、选择回调及权重未改。
- `scripts/prepare-final-backgrounds.py`：可重复衍生编码与源文件哈希/画质验证；无cwebp时回退无损WebP。
- `scripts/review-final-scenes.py`：打包真实截图、测量与公开审核页。
- `tests/final-scenes.mjs`、`final-scenes-retake-player.mjs`、`final-scenes-network.mjs`：本轮浏览器与加载验证。
- `tests/transitions.mjs`、`speech-regression.mjs`：更新净图请求匹配与测试等待条件。
- `docs/final-background-assets.json`、本报告与 `public/review/final-static/*`：资产审计、验收证据。

`src/App.tsx`、`session.ts`、语音识别组件和页面切换事务代码没有修改。`package.json`及依赖未修改或新增。

## 启动、待审核与现有限制

`cd experience && npm run dev -- --port 5210`；生产预览为 `npm run build && npm run preview -- --port 5211`。打开地址后从01开始体验。以 `STATIC_BASE_URL=http://localhost:5211 node tests/final-scenes.mjs` 复现浏览器验收，WebKit可设置 `ENGINE=webkit`。

- 未找到荆霄鹏行楷字体文件或网页嵌入授权。本轮保持原 `--experience-font` 配置，未下载替代字体、未声称已部署目标字体。
- 现有AI生成、重新生成和调整是明确标注的模拟逻辑；05是手动静态预览控件；07是明确标注的18个演示词与会话内分享展示。未新增真实生成API、共享数据库或上传服务，也未将演示词宣称为新收集的参与者数据。
- 已运行Linux Chromium与Playwright WebKit，尚未完成macOS/iOS实机Chrome/Safari、真实麦克风权限与识别准确率测试。数据不是实际设备帧率或GPU内存测量。
- 手机为保护完整画面与可读控件采用可滚动布局；06聚焦水镜，因此部分左侧远景在该尺寸裁切。桌面以16:9为主要效果，其他比例使用等比cover，不拉伸原图。
- 静态艺术效果仍待用户逐页审核；本轮没有开始新的动态制作。
