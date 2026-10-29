# 自我的彼岸 — The Other Side of Self

Phase 1 / Phase 2：可运行的七幕交互艺术原型。React + TypeScript + Vite，无服务器、无需 API Key。

## 启动

需要 Node.js 22.18+（建议 24）与 npm。

```bash
cd experience
npm ci
npm run dev
```

在项目仓库根目录执行以上命令，访问终端打印的地址（默认 http://localhost:5173）。

```bash
npm run build
npm run preview
npm test
```

如果当前环境的默认 npm 缓存不可写，可使用 `npm ci --cache /tmp/self-npm-cache`。

## 已完成

- 全局色彩 token、宋体标题、统一 01–07 编号/标题/正文/按钮/旅程进度线。
- ExperienceSession 类型、明确的七幕状态转换与退出重置。
- 持久化 SceneBackground / PersistentScene，翻页不卸载；Canvas 建筑环境、反射、水纹、双层薄雾、自然光照、鼠标视差。
- 统一 PageShell、PageHeader、PrimaryButton、JourneyProgress、VoiceInput、TextInput、TransitionLayer。
- 七页布局与内存模拟交互：理想描述、一次补充、场景调整、习惯多选与最多四轮细化、4 秒光影演示、自述、实际分享文本确认、可交互演示词云、完整退出。
- 浏览器语音识别入口，不支持/权限错误时明确提示，文字可独立完成全流程。语音可能通过浏览器在线服务识别；只在主动点击后申请权限。
- prefers-reduced-motion 与手动减弱动效。1920×1080、1440×900、1366×768 及窄屏布局。

## 文件结构

```text
experience/
  index.html
  src/
    App.tsx           # 七幕编排与基础交互
    components.tsx    # 统一背景和共用组件
    session.ts        # 会话、状态图、固定文案、习惯选项
    styles.css        # 全局视觉系统、动效、响应式布局
    main.tsx
  tests/
    session.test.mjs   # 状态转换、清理、主题数量验证
    browser.mjs        # Chromium 全流程与四种尺寸验证
  docs/API.md
  .env.example
```

## 模拟与隐私边界

本次按照请求先完成 Phase 1–2，并提供可完整体验的模拟流程。始终标注「演示模式」。场景为实时程序光空间，并非 AI 根据输入生成的真实图片；调整仅改变光影。第五幕沿用同一空间做 4 秒变化并停在末态；「减弱动效」时不做光照演变，计时与流程仍可用。

第七幕的词汇明确标记为示例，不冒充真实参与者；使用 Master Prompt 针对数据不足指定的「这里将逐渐汇聚愿意分享的心声。」替代真实数据说明。分享只在本次内存中展示，未写入共享库。退出/刷新清除会话，不使用 localStorage、录音文件或持久化私人内容。外部字体请求不携带输入；网络不可用时使用系统宋体/无衬线回退。

## 后续阶段

1. Phase 3–4：完善语音兼容性、录音状态与习惯问答组件拆分；超过四主题的优先级选择。
2. Phase 5–7：服务端 A/B Provider Adapter、Zod 响应校验、loading/error/retry/fallback；接入真实图像、原图保留及图生视频（3–5 秒）/Canvas 降级。
3. Phase 8–9：可选摄像头镜面及资源释放、关键词整理、明确授权后的脱敏审核、SQLite 匿名聚合词云。
4. Phase 10：真实设备权限测试、弱网/异常路径、字体离线打包、性能与可访问性验收。

当前没有 HTTP AI 接口或数据库。不要把此原型当成已完成全部十个阶段。

## 浏览器验证

`tests/browser.mjs` 使用 Playwright 与系统 Chromium。安装开发测试工具后执行：

```bash
npm install --no-save playwright
node tests/browser.mjs
```

测试截图输出到忽略跟踪的 `artifacts/`。实际麦克风授权和识别准确性需要真实设备手动测试。


## GitHub Pages 部署

公开访问地址：https://yujie0909.github.io/AIE3905-group7-The-Other-Side-of-Self/

`main` 保存应用源代码；`gh-pages` 仅保存 `npm run build` 生成的静态站点。
Vite 使用相对资源路径，支持仓库子路径。Pages 设置为从 `gh-pages` 分支根目录部署。

后续更新在仓库根目录执行 `bash experience/scripts/deploy-pages.sh`。脚本先执行测试和构建，再将产物推送到 `gh-pages`；需要 Git、Node.js 和已授权的 GitHub CLI。脚本不会提交或推送源代码，源代码需独立提交。


## 视觉与动效重构

见 [docs/VISUAL-REVIEW.md](docs/VISUAL-REVIEW.md)。`src/SceneCanvas.tsx` 为持续挂载的 Canvas 2D 环境层，`src/sceneConfig.ts` 统一管理七幕光照与动效参数。`public/environment.jpg` 是本项目专用的共享建筑美术资产，不是根据观众输入生成的个性化世界。七幕均延续这一场景，没有新增人物或额外数据传输。关键录屏和逐页截图保存在本地 `artifacts/refinement/`。
