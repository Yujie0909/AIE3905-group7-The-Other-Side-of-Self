# 七页面同步切换与背景预加载

本次基线为提交 `6c0f0de`，仅改变背景资源管理、进入页面的协调方式和整场景淡入。没有修改背景资产、页面组件、字体配置、文案、字号、玻璃弹窗、镜面寄语或词云数据。

## 根因

原 `App.tsx` 直接修改 `currentPage`；新组件挂载后，`useSceneBackground` 才请求当前背景并解码。背景未就绪时，其旧场景兜底层只包含图景，不包含旧页面 UI。因此新文字与导航已呈现，背景仍是上一页。原空闲预载只覆盖 01→02；03 起仍在挂载时请求。已存在的图片缓存也在每次调用时重复运行解码。

用 Network、逐帧 DOM 状态和 DevTools Performance trace 验证，没有 Suspense、动态 import 或人为背景切换计时器。旧版受控延迟截图见审核页；真实慢网 02→03 出现 10.58 秒 UI/背景错配。

## 实现

- `src/sceneResources.ts`：按 URL 复用 Image 对象及 Promise，记录 idle/loading/ready/error；下载后等待 `Image.decode()`。场景就绪需涵盖底图和桌面原景 SVG 所用图像。窄屏只准备实际显示的底图。进入缓存场景时重验解码，兼顾位图被浏览器释放的情况。失败资源可重试；45 秒是网络/解码恢复期限，不是切换延时。
- `src/backgroundLoading.ts`：复用资源注册表及实际 DOM 图像解码。首页稳定后空闲预载 02，此后每页过渡完成后预载下一页，直到 07；不递归预载全部页面。当前进入请求提升优先级。Save-Data/2g 不进行主动空闲预载。宽窄屏变化重新匹配所需资源。
- `src/pageTransition.tsx`：同步意图锁阻止连点重入；业务结果就绪后再等待目标背景。等待期间当前场景、文字、表单、导航保持原状。事务一次提交数据包及 pageIndex，再确认挂载图景已解码，才揭示新场景。失败保留/恢复旧状态，提供重试或留在此页；重试不重新执行业务生成或同意分享操作。
- `src/page-transition.css`：支持时使用原生 View Transition 的旧、新整场景位图，背景、文字及导航共同交融；否则使用两个完整场景图层作 opacity 叠合。旧层保持不透明，新层淡入，避免双层同时降低 alpha 造成暗闪。360ms，cubic-bezier(.4,0,.2,1)。无实时滤镜动画。旧 DOM 副本 inert/aria-hidden，没有 React 效果或录音事件，并重命名 SVG ID，防止镜面/遮罩引用冲突。临时合成提示和副本结束后清理。减少动态效果设置使用无动画原子切换。
- `src/App.tsx`：统一下一步、返回、已访问章节导航、退出的入口。保留原 700ms 模拟业务生成、确认步骤及所有既有数据含义；同意/拒绝的数据与目标页面同步提交。生成操作增加同步防重入保护。持久外层不再继承上一场景滚动位置；进入新场景回到页首，若失败回滚恢复原滚动位置。

## 实测与方法

Linux Chromium，本地生产构建、1440×900。优化前为同一项目基线的生产构建。普通网络 3 次冷上下文，表中为中位数；慢网 1 次冷上下文，CDP 限制 150ms 延迟、200KiB/s 总下载带宽。两版本在 Page02 提交前分别停留相同的 1 秒（普通）/12 秒（慢网），模拟用户输入期间的预加载机会。保留原来的 700ms 模拟处理。错配时长定义为第一帧观察到新UI但背景未就绪，直到第一帧背景就绪的rAF采样间隔；受帧采样精度限制。以下是观测值，不能当作所有设备的固定耗时。

| 指标 | 修改前 | 修改后 |
|---|---:|---:|
| 普通网络 UI 先于完整背景的窗口 | 131.9ms | 0ms |
| 慢网 UI 先于完整背景的窗口 | 10,580.5ms | 0ms |
| 普通网络 点击→完整新背景 / 新场景可开始淡入 | 858.0ms | 900.8ms |
| 慢网 点击→完整新背景 / 新场景可开始淡入 | 11,308.5ms | 835.4ms |
| 普通网络 点击→全部切换清理完成 | 858.0ms | 1,387.5ms |
| 慢网 点击→全部切换清理完成 | 11,308.6ms | 1,316.9ms |
| Page03 在提交前完成预载解码 | 否 | 是（本轮普通及慢网） |
| 02→03 Performance Paint 事件数 | 10 | 7 |

“可开始淡入”使用原生 transition.ready 标记；旧版使用完整背景的第一轮 rAF 观测。trace 中新动画开始到 transition.finished 的墙钟中位数为 486.7ms（普通）/481.5ms（慢网），包含浏览器快照及最终绘制/清理调度，不能全部称为淡入时长。单独不启用 trace/录屏的动画事件检查，9 次 start→end 为约 349.0–373.1ms，elapsedTime 均为 0.36 秒，Animation.effect.duration 均为 360ms。普通网络总体事务增加了有意的淡入和快照开销，未声称普通网络端到端变快。

首页稳定前只准备首页，随后只发现 Page01+Page02 三个背景 URL；不是首页同时下载全部七页。完整桌面旅程共 13 个不同背景 URL、13 次有响应体的传输；再次访问 02、06、07 的新增图片传输为 **0 字节**。重复 DOM/Image 引用可出现缓存命中事件，不等于重复下载。过渡结束停留 1.5 秒，Paint=0、运行动画=0、旧场景副本=0、临时 will-change 已移除。图片编码、体积、缓存头均未改动，GitHub Pages 仍为 max-age=600+ETag，使用内容哈希文件名。

## 实际交互回归

- Chromium 原生过渡、禁用原生 API 的双图层回退、prefers-reduced-motion，以及 Linux Playwright WebKit 的原生/回退路径：01→07、重新生成与调整、习惯进一步选择、返回、首次意图锁、十次连点生成、输入保留、重置均通过。
- 冷上下文拦住 Page03 原景层：业务完成后仍显示完整 Page02 和激活步骤02，无 Page03 UI；放行后同步进入。Page04 背景请求失败后仍停留 Page03，重试成功。该故障注入测试启用了路由，未拿它证明 HTTP 缓存。
- 分享确认实际触发：同意只展示确认的文本，拒绝不展示个人文本；返回编辑不丢输入，关闭/外侧点击/Escape 不视为同意；没有新增上传请求。
- Page02/04/06 分享玻璃弹窗在 1920×1080、1366×768、390×844、320×667 对照样式及实际操作通过。历史测试的坐标改为场景局部坐标比较，避免把旧脚本残留的 6px 滚动当作排版变化。
- 七页在 1920×1080 和390×844截取完整场景，检查无横向溢出及稳态动画。既有 1672×941、1366×768 等静态回归共28个页面/尺寸组合亦通过。
- 镜面在两引擎的1440×900、1280×720、390×844均验证三行全文及26个字形实际绘制、位于镜面安全区域内。未修改镜面相关组件或 CSS。
- 约11.37秒实际屏幕录制：01→07、123个原始浏览器帧；逐帧亮度统计无黑/白统一色帧，已查看录帧联系图，未发现空白或旧背景延迟覆盖。该检查不等同于实机帧率测量。
- `npm test` 三项通过；`npm run build` TypeScript/Vite 通过。

## 限制及尚未验证

不能把 Linux WebKit 称为真实 macOS/iOS Safari；真实 Safari、真实 Google Chrome 应用及手机硬件 GPU 帧率未在本环境测量，尚需真人实机主观审阅。Chromium 对外部 HTTPS 存在云代理证书信任错误，本地预览使用项目原有字体回退配置；没有绕过证书验证，没有新增/替换字体。语音硬件权限及真实 AI/云端上传服务没有实测，项目仍保留原有模拟业务实现。跨设备绝对耗时不作保证，用户点击过早而资源未完成时仍会等待，但保持整张当前页并显示准备反馈。

## 复现与产物

```sh
npm test
npm run build
npm run preview -- --port 5184
# 下面工具读取 STATIC_BASE_URL；默认 http://localhost:5184
node tests/transitions.mjs
TRANSITION_MODE=fallback node tests/transitions.mjs
TRANSITION_MODE=reduced node tests/transitions.mjs
ENGINE=webkit node tests/transitions.mjs
node tests/transition-audit.mjs
LABEL=after node tests/transition-performance.mjs
LABEL=after SLOW=1 node tests/transition-performance.mjs
CAPTURE_MODE=short node tests/transition-capture.mjs
```

浏览器测试依赖已可用的 Playwright、Chromium/WebKit；录制使用系统 ffmpeg。WebKit 的 Linux 运行库是本环境临时配置，不写入应用依赖。`transition-baseline.mjs` 默认连接5189的旧版生产服务。性能对照前需将旧生产目录和当前dist分别用相同缓存头服务，不要拿开发构建作性能基线。

审核页：`public/review/transitions/index.html`，包含七页桌面/移动截图、11秒实际录制、等待画面对照、动画时序、网络/Performance原始证据包和上述限制。
