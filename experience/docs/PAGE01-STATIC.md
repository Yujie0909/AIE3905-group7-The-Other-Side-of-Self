# Phase 1 · Page 01 静态还原

依据 `references/page 01.png` 和 `docs/页面设计.rtf` 的全局及 PAGE 01 章节。仅查看 Page 01 参考图，未查看其余六张图片、未开发其余页面。

## 代码与资产

- `src/pages/Page01Welcome.tsx`：独立的首页 HTML/React 结构；真实标题、正文、开始按钮和恰好七个进度节点。
- `src/pages/page01.css`：全部样式限于 `page01-*` 命名空间；按参考图相对位置与尺寸布局，宽屏保持原构图，窄屏调整裁切和文字尺寸。
- `src/App.tsx`：第 1 页直接渲染静态组件；开始按钮进入既有第 2 页；移除旧首页分支和仅用于该分支的 intro 状态。2–7 组件、场景、业务与 API 均未重构。
- `public/scenes/page01-reference-clean.jpg`：由参考图图像修复获得的无 UI 背景，保留建筑、光源、台阶、树木、山景和水面；没有把原始设计图的文字与按钮烘焙进网页。
- `tests/page01-static.mjs`：五种视口截图、像素稳定性、无 Canvas/无持续 RAF/无活动动画、七节点和全流程回归。
- `public/review/page01-static.html` 及其图片/JSON：独立的静态验收报告，不属于七幕主流程。

入口仍为 `src/main.tsx`，使用原 React + TypeScript + Vite 项目，不创建替代项目。

## 静态边界

Page 1 不挂载 BackgroundRenderer，未添加粒子、动态照明、视差、滚动动画或转场。开始按钮立即进入既有 Page 2；Page 2–7 原本的动画和功能保留。本阶段没有开发 Phase 2 动效。

首页隐藏的无障碍说明保留演示与语音权限信息，不以额外卡片改变参考构图。

## 验证

```bash
npm run dev -- --port 5174 --strictPort
node tests/page01-static.mjs
npm run build
npm test
```

浏览器测试需要已有 Playwright 与系统 Chromium；没有新增应用依赖。截图比较等待背景图片和字体加载完成。覆盖 1672×941（原图尺寸）、1920×1080、1440×900、1366×768 和 390×844。空闲截图像素一致、无活动动画、无持续 RAF、无动态 Canvas。开始按钮、2–7 文本/调整/习惯/自述/分享/词云及退出重置通过。

本地证据：`artifacts/page01-static/`。公开预览附带 `review/page01-static.html`。

## 剩余视觉差异

- 参考图是完整设计图，没有提供无文字原始背景；已通过图像修复清除 UI，但修复区的石材、水面和雾纹理仍会有细微差别，不能声称背景逐像素相同。
- 标题/正文为真实网页字体，不是截图像素；字形与字体栅格化可能和参考略有差异。
- 原参考图底部多出重复 07，正式规范要求七阶段，本实现保留恰好 01–07 七个节点，间距因此与原图存在有意差异。
- 小屏幕保留主体方向和文字可读性，采用裁切，无法同时保留完整 16:9 全景。
