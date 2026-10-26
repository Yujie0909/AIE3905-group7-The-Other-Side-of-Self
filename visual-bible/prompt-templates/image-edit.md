# Image Edit Prompt Template — 《自我的彼岸》

> `visual_bible_version: v1`
> 用途：在已有主形象图基础上做**局部/风格化编辑**（不改变已确认意图的前提下微调），例如换时刻、调冷暖、加/减物件。
> 同样分离 **A. 固定美学规则** 与 **B. 个性化编辑变量**。

---

## A. 固定美学规则（FIXED — 同 image-master.md，禁止修改）

- 色彩引用 `palette.json`，低饱和低对比，禁高饱和撞色、禁纯黑主色。
- 柔和侧逆光/漫射天光；避免硬阴影、舞台聚光。
- 构图留白、主体偏小环境偏大；人物不露脸特写。
- 沉浸/克制/诗意/空间感/缓慢变化。
- 禁止文字/Logo/UI、商业海报构图、霓虹/赛博朋克、无意义光效、把未确认推断当事实。

---

## B. 个性化编辑变量（VARIABLES）

| 占位符 | 说明 |
| --- | --- |
| `{{SOURCE_IMAGE_REF}}` | 被编辑的源图 job_id / reference_asset_id |
| `{{EDIT_INSTRUCTION}}` | 本次具体编辑指令（如"把时刻改为清晨""去掉远处人群"） |
| `{{KEEP_CONFIRMED}}` | 必须保持不变的已确认要素（来自 world_brief.intent 中 status=confirmed） |
| `{{PALETTE}}` | 目标配色（引用 palette.json） |
| `{{AVOID}}` | 编辑后仍须排除的元素 |

> 编辑约束：只能修改用户明确要求的变量；任何 `status=confirmed` 的要素默认进入 `{{KEEP_CONFIRMED}}` 保持不变。未确认推断可被弱化或移除，但不得新增为"事实"。

---

## C. 组装后编辑提示词骨架

```text
[源图] 基于 reference {{SOURCE_IMAGE_REF}} 进行局部编辑，保持整体风格与 Visual Bible v1 一致。

[编辑指令] {{EDIT_INSTRUCTION}}。

[保持不变] 以下已确认要素不可改动：{{KEEP_CONFIRMED}}。

[配色] {{PALETTE}}。

[约束] 禁止文字/Logo/UI；不露脸特写；排除：{{AVOID}}。
```
