# Video Motion Prompt Template — 《自我的彼岸》

> `visual_bible_version: v1`
> 用途：将主形象图扩展为**缓慢动态影像**（视频生成）。本模板仅做"动态潜力"描述，**不在此阶段实际连接视频生成 API**。
> 分离 **A. 固定动态规则** 与 **B. 个性化动态变量**。

---

## A. 固定动态规则（FIXED — 禁止修改，对齐 style-profile.json motion）

- **镜头**：固定长镜或极缓慢推拉；避免快速摇移、变焦、手持抖动。
- **动态主体**：环境微动（水波、雾流、光影缓移）为主；人物动作极缓。
- **循环**：必须无缝循环（loop=true）。
- **节奏**：单段 8–16 秒，整体缓慢，变化幅度小。
- **气质延续**：与静态图一致——沉浸、克制、诗意、空间感。

---

## B. 个性化动态变量（VARIABLES）

| 占位符 | 来源字段 | 说明 |
| --- | --- | --- |
| `{{ENVIRONMENT_MOTION}}` | motion_plan.environment_motion | 具体环境微动（如"远处海面极缓起伏"） |
| `{{CAMERA_MOTION}}` | motion_plan.camera_motion | 极缓推/拉/固定 |
| `{{PEOPLE_MOTION}}` | 由 intent 决定 | 人物若有，仅极缓动作 |
| `{{DURATION}}` | motion_plan.duration_seconds | 单段时长（8–16s） |
| `{{LOOP}}` | motion_plan.loop | 是否无缝循环 |
| `{{SCENE_STILL}}` | 引用主形象图 | 动态化基础帧 |

---

## C. 组装后动态提示词骨架

```text
[基础帧] 以主形象图（{{SCENE_STILL}}）为起点，保持 Visual Bible v1 风格与配色（palette.json）。

[环境微动] {{ENVIRONMENT_MOTION}}。

[镜头] {{CAMERA_MOTION}}，单段 {{DURATION}} 秒。

[人物] {{PEOPLE_MOTION}}（若有）。

[循环] {{LOOP}} 无缝循环；整体缓慢、变化幅度小、沉浸克制。
```

> 注：第三阶段仅生成该动态描述文本与 World Brief 记录；真实视频生成接口（如豆包视频生成）预留于 `generation.video_model`，当前返回 `demo_status`，**不调用任何外部视频 API**。
