# Phase 1 · Pages 2–7 静态视觉还原

本轮执行用户粘贴的《PHASE 1 — IMPLEMENT PAGES 2–7》及 `docs/页面设计.rtf`，逐页读取相应参考图；没有继续开发 Phase 2 动效。

## 逐页状态与原始参考

| 页 | 原始参考（精确文件名） | 实际组件 | 主体与布局 |
| --- | --- | --- | --- |
| 01 | references/page 01.png | Page01Welcome.tsx（保留） | 已批准的静态首页，源文件/样式/背景未改 |
| 02 | references/page 02 .png（02 后有空格） | Page02Dream.tsx | 山湖、天空光带、居中麦克风与胶囊输入框 |
| 03 | references/page 03.png | Page03Ideal.tsx | 开放式建筑、沙发、石桌、湖景及右下三操作 |
| 04 | references/page 04.png | Page04Daily.tsx | 自然窗光、纱帘、七个带图标主题、右侧麦克风和底部输入 |
| 05 | references/page 05.png | Page05Evolution.tsx | 前景工作桌、城市与山湖、播放器静态控件 |
| 06 | references/page 06.png | Page06Reflection.tsx | 拱形光口、左侧表达输入、右侧真实墙面文字 |
| 07 | references/page 07.png | Page07Voices.tsx | 星空山湖、静态关键词云及右下退出按钮 |

六页均已实现并接入原会话状态机；背景并非只换标题的通用模板。每页使用自己的原始参考艺术和专门的无 UI 修复底图。

## 精确源码清单

新增：
- src/pages/Page02Dream.tsx
- src/pages/Page03Ideal.tsx
- src/pages/Page04Daily.tsx
- src/pages/Page05Evolution.tsx
- src/pages/Page06Reflection.tsx
- src/pages/Page07Voices.tsx
- src/pages/StaticLayout.tsx
- src/pages/ReferenceArtwork.tsx
- src/pages/static-pages.css
- tests/all-static.mjs
- tests/static-edge-cases.mjs

修改：
- src/App.tsx：保留 ExperienceSession、canTransition、多主题、转写编辑、调整、分享确认与退出清理；页面切换直接更新状态，去掉旧转场和第五页自动推进计时。真实 AI 接口本来未配置，本轮没有改为新的 AI 服务。
- src/components.tsx：VoiceInput 增加提示状态属性及麦克风形状标记，供静态布局展示错误/权限提示；语音逻辑不重写。
- tests/page01-static.mjs：适配更新后的 2–7 交互控件名称。

资产：`public/scenes/page02-reference-clean.jpg` 至 `page07-reference-clean.jpg`。原始参考文件未修改。`ReferenceArtwork` 在桌面视口保留原图的非 UI 艺术像素，使用静态 SVG 遮罩让修复底图只填充原文字/控件区域；真实 HTML 字体与按钮位于上层，避免旧文字重影。窄屏使用独立修复底图并裁切，避免遮罩与小屏布局错位。

验证报告：`public/review/index.html`、`public/review/static-page-*.jpg`、`public/review/static-comparison-*.jpg`、`public/review/static-phase1-results.json`。原动效验收页作为历史资料保留，不作为本阶段结果。

## 静态边界与保留功能

不挂载 BackgroundRenderer/Canvas，不使用 RAF、不自动播放视频、不自动推进时间、不执行页面淡入/切换动画。旧场景代码保留供后续阶段使用，但当前页面不会调用它们。波形、天空光带、星点和连接弧线都是静态图形。

保留：语音转写及编辑、文本输入、一次补充、模拟生成/重新载入、调整描述、返回描述、手动细节视图、最多四轮习惯细化、跳过、自述、确认实际分享文本、词云选择、退出及会话清理。第五页的播放/暂停图标和拖动位置响应用户操作；本阶段只有静态预览，不伪称真实视频正在播放。

## 执行验证

```bash
npm run dev -- --port 5174 --strictPort
node tests/all-static.mjs
node tests/speech-regression.mjs
npm run build
npm test
npm run preview -- --port 5181 --strictPort
STATIC_BASE_URL=http://localhost:5181 node tests/all-static.mjs
```

浏览器验证使用系统 Chromium、已有 Playwright，无新增应用依赖。正常动效偏好环境下检查 1672×941、1920×1080、1366×768、390×844 四种尺寸，每页等待图片/字体加载后实际截图，并比较静置前后像素；七页均无 Canvas、无活动动画、无横向溢出且均有七个进度节点。检查图片请求状态、JS 异常与七个独立背景地址。

实际全流程覆盖 1→7、返回描述、模拟重新载入、细节视图、调整、习惯、静态播放器、反思、实际分享文本确认、词云及退出清理。另模拟语音成功/拒绝权限/不支持三条路径。首页与上一轮已批准的 1672×941 截图逐像素比较相同。

## 已知差异与限制

- 真实字体的字形、字重与参考截图中的栅格化有细微差异；部分纹理在 UI 修复区域中不同。桌面非 UI 艺术区域直接保留原图以缩小差异，不能声称整张页面逐像素一致。
- 原图中部分进度编号重复或缺失；正式网页统一为 01–07 七个真实节点。
- 保留退出、返回、调整面板、隐私与演示说明等必要功能，因此默认画面有少量参考图没有的小字入口。实际分享确认面板仅在操作后出现。
- 07 按文档对真实数据不足的规定显示“这里将逐渐汇聚愿意分享的心声”，词云明确标注演示，不冒充真实参与者数据。
- 03/05 是各自参考图的静态示例，尚未接入真实个性化图像/视频服务；第五页不会自动播放。正式生成结果和同世界图生视频属于后续接入，不在本次静态验收中伪装完成。
- 小屏采用裁切和紧凑布局，不可能完整保留桌面全景。真实麦克风收音、真人连续视觉评审和真机性能未实测。

实际验收页面已逐页查看并排截图；28 个组合均通过，原首页截图逐像素一致，语音三条模拟路径和短输入追问的桌面/手机可达性通过。生产构建预览亦已走通所有七页并检查静态资源路径。
