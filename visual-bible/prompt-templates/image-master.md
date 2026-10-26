# Image Master Prompt Template — 《自我的彼岸》

> `visual_bible_version: v1`
> 用途：将已**确认**的观众意图转化为「主形象图（静态）」生图提示词。
> 本模板严格分离 **A. 固定美学规则（不可修改）** 与 **B. 个性化场景变量（由观众意图填充）**。

---

## A. 固定美学规则（FIXED — 禁止修改，对齐 Visual Bible v1 / style-profile.json）

- **色彩**：引用集中维护的 `palette.json`：深海蓝 `#04222E`（基底）、青绿 `#0E5A57`（中景）、柔和青蓝 `#8EDBE4`（光/焦点）、暖白 `#F4EFE6`（人物/织物）。整体保持**低饱和、低对比**的水下/晨雾质感；允许柔和青蓝与暖白之间细微偏移，**禁止高饱和撞色**；禁止纯黑作主色（暗部为深海蓝延伸）。
- **光线**：柔和侧逆光或漫射天光；避免硬阴影与舞台聚光。光是"被理解的温柔"。
- **构图**：三分法或中心留白；主体偏小、环境偏大，给观众"身处其中"的空间感；避免居中对称商业海报构图。
- **纵深**：近景柔焦（手/肩/物件）→ 中景氛围 → 远景（海平线/林线/天光）三层。
- **材质**：棉麻、未抛光木、石、水面、雾、织物；拒绝金属高光塑料感与玻璃幕墙炫光。
- **人物**：仅背影 / 侧影 / 局部（手、肩、发），**不露脸特写**；人物是观众投射而非模特。
- **气质**：沉浸、克制、诗意、空间感、缓慢变化；少即是多，留白大于填满。
- **禁止**：文字/标语/Logo/UI 叠加；商业广告式构图；过度饱和/霓虹/赛博朋克高对比；无意义光效堆叠（光剑/爆炸/粒子洪流）；把未确认的心理推断当作事实强行视觉化。

---

## B. 个性化场景变量（VARIABLES — 由观众意图填充，下方 `{{...}}` 占位由后端组装替换）

| 占位符 | 来源字段 | 说明 |
| --- | --- | --- |
| `{{SUBJECT}}` | visual_plan.subject | 画面主体（人物姿态/局部，或核心物件） |
| `{{SCENE_LOCATION}}` | intent.scene.location + environment | 场景地点与自然环境 |
| `{{ACTIVITIES}}` | intent.activities | 观众在其中进行的活动 |
| `{{TIME_OF_DAY}}` | motion_plan / user 输入 | 一天中的时刻 |
| `{{SOCIAL_CONTEXT}}` | intent.social_context | 独处 / 与亲友相伴 |
| `{{PALETTE}}` | visual_plan.palette（引用 palette.json） | 本帧配色 |
| `{{LIGHTING}}` | visual_plan.lighting | 具体光线描述 |
| `{{COMPOSITION}}` | visual_plan.composition | 具体构图 |
| `{{MOOD}}` | visual_plan.mood | 情绪氛围 |
| `{{MATERIALS}}` | visual_plan.materials | 材质细节 |
| `{{AVOID}}` | intent.avoid | 明确不要的元素 |
| `{{CAMERA}}` | camera（style-profile.json） | 镜头建议 |

> 组装规则：仅使用 `intent` 中 `status=confirmed` 或 `status=unconfirmed` 且 `source=user` 的内容作为事实；`source=model_inference` 且 `status=unconfirmed` 的推断**只能**以"或许/暗示"的弱语气出现，绝不作为确定事实。

---

## C. 组装后提示词骨架（ASSEMBLED PROMPT）

```text
[风格锁定] 沉浸式艺术影像，低饱和低对比的水下/晨雾质感，色彩引用 Visual Bible v1 调色板（深海蓝基底、青绿过渡、柔和青蓝光、暖白人物）。

[场景] {{SCENE_LOCATION}}。{{ACTIVITIES}}。{{TIME_OF_DAY}}。{{SOCIAL_CONTEXT}}。

[主体与构图] {{SUBJECT}}。{{COMPOSITION}}。

[光线与材质] {{LIGHTING}}。{{MATERIALS}}。

[氛围] {{MOOD}}。{{PALETTE}}。

[镜头] {{CAMERA}}。

[约束] 禁止文字/Logo/UI；不露脸特写；避免商业海报构图与高饱和霓虹；明确排除：{{AVOID}}。
```

> `prompt_version` 与该模板绑定（独立于 Visual Bible 版本），并在 World Brief 的 `generation.prompt_version` 记录以便复现。
