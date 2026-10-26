# 《自我的彼岸》The Other Side of Self

沉浸式交互艺术项目。已完整实现 **Observe（看见自己）** 与 **Imagine（表达理想）** 两个阶段，并完成 **Visual Bible 与视觉基准系统（开发期）**：建立集中化艺术方向（Visual Bible v1、调色板、风格画像、提示词模板）、World Brief 数据结构与 JSON Schema、24 个基准场景、评分量表，以及仅开发期可用的基准测试台（不接入展览路由、不调用任何图像/视频生成 API）。

技术栈：Vue 3 + TypeScript + Vite（前端）；Node 内置 http 服务（后端意图解析 API，无需框架）。

## 启动

```bash
npm install

# 方式一：前后端一起启动（推荐）
npm run dev:all
#   前端 http://localhost:5173  （Vite 已代理 /api → :8787）
#   后端 http://localhost:8787

# 方式二：分别启动
npm run dev       # 仅前端
npm run server    # 仅后端意图解析 API

npm run build     # 类型检查 + 生产构建
npm run preview
```

> 后端未配置 `DEEPSEEK_API_KEY` 时进入明确标注的 **mock 模式**（非真实 AI，仅用于 UI 测试，前端不声称已接通）。
> 配置后调用任意 **OpenAI 兼容的 LLM 服务**（如 DeepSeek、本地部署等），通过官方 OpenAI 兼容 SDK 访问。

## 两个阶段

### 第一阶段 · Observe（01 / OBSERVE）
```
welcome ──开始探索──▶ startTransition (AI 回应淡入) ──继续──▶ imagine_intro
   │                                                                  │
   └────再停留一会儿──▶ pause ──开始探索──▶ startTransition            │
              └───────────── 再停留一会儿保持（不追加/不跳转）──────────┘
   imagine_intro ──开始表达──▶ Imagine 阶段（App 切换 phase）
```
- WELCOME：5 行欢迎文案 + 轻提示 + 「开始探索」「再停留一会儿」。
- PAUSE：追加安抚回应，保留两入口。
- START_TRANSITION：AI 回应淡入，约 1.8s 后揭示「继续」。

### 第二阶段 · Imagine（02 / IMAGINE）
前端状态机 `useImagineState`：屏幕 `enter → dialog → summary`；**视觉状态** `IDLE / LISTENING / THINKING / REVEALING / WAITING / ERROR` 仅由真实事件驱动。
对话经统一接口 `POST /api/imagine/conversation`（文字与语音共用），由 LLM 基于上下文生成自然回应并更新结构化意图；信息充分时由模型建议 `ready_for_clarify`，不自动跳转。

```
enter ──开始表达/我还没想好──▶ dialog（镜面空间）
dialog ──提交文字或语音──▶ THINKING ──POST /api/imagine/conversation──▶ REVEALING（回应淡入）→ WAITING（等待观众）
WAITING ──跳过/继续──▶ summary ； ──看看 AI 如何理解──▶ Clarify（接口预留）
```

沉浸式视觉：保留深海蓝 / 青蓝背景与中心镜面圆环（`ImagineMirror`），叠加 Canvas 微光粒子（`ImagineParticles`，三层景深、缓慢漂移、尊重 reduced-motion）；普通聊天气泡已移除，AI 回应作为独立文字层、用户表达作为弱化痕迹。

## 语音识别方案（选择理由与根因修复）
保留 **浏览器原生 `SpeechRecognition` / `webkitSpeechRecognition`（`zh-CN`）**，并修复了此前故障的根因：
1. 经局域网 IP（非 localhost / HTTPS）访问时处于非安全上下文，`SpeechRecognition` 为 `undefined` → 明确标记为「浏览器暂不支持」，而非含糊的“语音暂不可用”。
2. `onend` 未在终值送达后复位 `transcribing` 状态，导致按钮卡在“正在整理” → 现已在终值后复位 `idle`，无结果结束则提示“未听清”。
3. 错误码被统一成“语音识别出现问题” → 现按 `not-allowed`(权限) / `audio-capture`(无设备) / `no-speech`(未听清) / `network`(网络) / `aborted`(取消) / 不支持 分别提示。
未采用后端 `MediaRecorder` 转录：原型对识别一致性要求可控、原生更轻、零音频存储；如部署后实测不稳，可在 `useSpeechRecognition` 与 `server/` 替换为 `gpt-transcribe`（DeepSeek 不提供转录，语音识别由浏览器或独立转录服务负责）。

## 意图解析 API

- 路径：`POST /api/imagine/conversation`（Vite 代理 `/api` → `:8787`）。
- 请求：`{ session_id, request_id, message, input_mode, history, intent, confirmed_values, inferred_values }`
- 响应：`{ assistant_response, dialogue_action, should_ask_question, next_question, intent, confirmed_values, inferred_values, missing_information, ready_for_clarify, reason_for_transition }`
- 密钥：`DEEPSEEK_API_KEY` 仅服务端环境变量；前端不持有，也不返回系统提示词。
- DeepSeek 接入：复用官方 OpenAI 兼容 SDK（`baseURL=DEEPSEEK_BASE_URL`，默认 `https://api.deepseek.com`，模型 `DEEPSEEK_MODEL` 默认 `deepseek-chat`），使用 `response_format: json_object`；服务端对空内容/非法 JSON 做有限次重试与修复（不无限请求）。

## 目录结构

```
src/
├── main.ts / App.vue                     # 入口；phase 在 Observe / Imagine 间切换
├── styles/{tokens,base}.css              # Design Tokens 与全局样式
├── types/imagine.ts                      # ImagineIntent / ConversationMessage / 等类型
├── api/
│   ├── imagine.ts                        # 第二阶段对话 API 客户端（仅调用 /api，无密钥）
│   └── worldBrief.ts                     # 第三阶段 World Brief 组装 API 客户端
├── composables/
│   ├── useExperienceState.ts             # 第一阶段状态机
│   ├── useImagineState.ts                # 第二阶段状态机 + 提交/解析编排
│   └── useSpeechRecognition.ts           # 原生语音识别封装
├── components/
│   ├── observe/  (ObserveStage / AmbientBackground / StageTypography / InteractionControls)
│   └── imagine/  (ImagineStage / ImagineInputBar / ImagineSummary)
└── benchmark/                            # 仅开发期：基准测试台（不接入展览路由）
    ├── main.ts
    └── BenchmarkPanel.vue

server/
├── index.mjs                             # 意图解析 + World Brief 组装后端（mock + OpenAI）
└── worldBriefAdapter.mjs                 # ImagineIntent → World Brief + 提示词组装（纯函数）

visual-bible/                             # Visual Bible（美术方向单一事实源）
├── visual-bible-v1.md
├── palette.json                          # 集中调色板（唯一色值来源）
├── style-profile.json
├── benchmark-scenes.json                 # 24 个基准场景 B01–B24
├── evaluation-rubric.md
└── prompt-templates/{image-master,image-edit,video-motion}.md

schemas/world-brief.schema.json           # World Brief JSON Schema（status/source 标记）

benchmark.html                            # 开发期基准测试台入口（非展览）
.env.example                             # 后端环境变量示例（勿提交真实密钥）
```

## 接入第三阶段 Clarify 的接口

`ImagineStage` 在 SUMMARY 点击「看看 AI 如何理解我的想象」时 `emit('clarify', intent)`；`App.vue` 的 `onClarify()` 为接口位，接收完整 `ImagineIntent` 草稿，下一步可切换 `ClarifyStage` 并传入该对象。第二阶段**不生成最终图像**，仅产出可编辑意图草稿。

## 第三阶段 · Visual Bible 与视觉基准系统（03 / VISUAL BIBLE，开发期）

> 本阶段把第二阶段**已确认**的意图转化为可复现的视觉生成蓝图（World Brief），并建立美术方向的单一事实源与开发期质量基准。**当前仅做「意图 → World Brief → 提示词」管线与校验，不调用任何图像/视频生成 API。**

### 美术方向单一事实源（集中维护，禁止散落硬编码色值）
- `visual-bible/visual-bible-v1.md` — 艺术方向总纲（艺术方向、色彩纪律、光线/构图/纵深/材质/人物、镜头与动态、固定规则 vs 可变参数、禁止项、版本管理）。
- `visual-bible/palette.json` — **集中调色板**（`deep_sea_blue #04222E` / `teal_green #0E5A57` / `soft_cyan_blue #8EDBE4` / `warm_white #F4EFE6` + 渐变 + 低饱和规则）。
- `visual-bible/style-profile.json` — 机器可读风格画像（光线/构图/纵深/材质/人物/镜头/动态、固定规则与可变参数、禁止项）。
- `visual-bible/prompt-templates/` — 三个提示词模板，**固定美学规则与用户个性化场景严格分离**：
  - `image-master.md`（主形象图）、`image-edit.md`（局部编辑）、`video-motion.md`（动态描述，不连视频 API）。

### World Brief 与 Schema
- `schemas/world-brief.schema.json` — World Brief JSON Schema（draft-07）。所有意图条目携带 `status`（`confirmed`/`unconfirmed`/`unknown`/`rejected`）与 `source`（`user`/`model_inference`），确保**未确认推断不会被当作事实**。
- `server/worldBriefAdapter.mjs` — 纯函数：第二阶段 `ImagineIntent` → World Brief；并据模板组装图像/动态提示词。`user_corrections` 会从推断中剔除冲突项。
- 后端路由 `POST /api/world-brief/assemble`：组装 + 用 **ajv** 服务端校验；**不调用图像 API**；预留豆包（Doubao）接口（环境变量 `DOUBAO_IMAGE_MODEL` / `DOUBAO_VIDEO_MODEL`），当前 `demo_status: no_generation_called`。
  - 请求：`{ intent: ImagineIntent, corrections?, world_id?, scene_id?, reference_asset_ids? }`
  - 响应：`{ visual_bible_version, prompt_version, world_brief, assembled_prompts:{image,video}, validation:{valid,errors}, doubao }`

### 基准场景与评分
- `visual-bible/benchmark-scenes.json` — 24 个基准场景（B01–B24，覆盖海边/森林/家/山间/湖边/乡村/城市/自然/工作室/雪山/庭院/海岛/草原/雨夜/晨雾/废墟花园/老屋/温泉/麦田/竹林/星空/雪原/未来城市）。
- `visual-bible/evaluation-rubric.md` — 1–5 分评分量表：意图准确度 30% / 视觉美学 25% / 风格一致性 20% / 结构可信度 15% / 动态潜力 10%；含严重缺陷硬性否决；要求**保存全部结果**而非仅最佳。

### 开发期基准测试台（DEV ONLY，非展览入口）
- `benchmark.html` + `src/benchmark/`（`main.ts` / `BenchmarkPanel.vue`）。仅开发期访问 `http://localhost:5173/benchmark.html`。
- 功能：选择 B01–B24 查看输入/必须包含/必须避免；编辑或生成意图（「载入示例意图」离线可用 / 「用对话生成意图」需 DeepSeek）；组装 World Brief；查看组装提示词与校验结果；记录每次运行（model/version/prompt_version/status/errors）并导出 JSON。
- **不接入展览路由**：主应用 `index.html` 不含该面板；不对展览输出任何调试信息。

### 安全与约束
- 所有 API 密钥仅服务端环境变量；前端不持有，也不返回系统提示词或密钥。
- 第三阶段**不伪造图像生成**：任何生成结果在豆包等真实接口接入前一律为 `null` / 演示占位，不对外宣称已完成图像生成。

## 无障碍与约束

- 麦克风/摄像头**绝不自动开启**；语音仅用户主动点击启动。
- 不分析外貌/人格/情绪；不对观众做心理诊断；`confidence` 仅表示信息是否明确。
- 所有按钮有可访问名称、焦点态，触摸目标 ≥ 44px；支持键盘（Enter 发送）。
- 尊重 `prefers-reduced-motion`；响应式适配桌面与窄屏。
