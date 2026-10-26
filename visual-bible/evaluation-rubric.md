# Visual Benchmark Evaluation Rubric — 《自我的彼岸》

> `visual_bible_version: v1`
> 用途：对"World Brief → 提示词 → 生成图像/动态"的结果进行人工或模型评分。开发期基准测试专用。
> 评分区间 **1–5 分**（5 = 极佳，1 = 不可用）。

## 1. 评分维度与权重

| 维度 | 权重 | 含义 |
| --- | --- | --- |
| 意图准确度 Intent Accuracy | 30% | 生成结果是否忠实覆盖 `intent` 中 `status=confirmed` 的要素；`must_include` 是否体现；`must_avoid` 是否被违反 |
| 视觉美学 Visual Aesthetics | 25% | 构图、光线、留白、材质、空间深度是否达到 Visual Bible v1 的"沉浸/克制/诗意"标准 |
| 风格一致性 Style Consistency | 20% | 是否严格遵守固定美学规则与 palette.json；有无高饱和/霓虹/商业海报/露脸等违例 |
| 结构可信度 Structural Plausibility | 15% | 场景逻辑是否自洽（地点、活动、时刻、人物是否合理共存）；是否有穿帮/拼贴感 |
| 动态潜力 Motion Potential | 10% | （针对视频/动态描述）环境微动、镜头、循环、节奏是否符合"缓慢变化"原则 |

**总分** = Σ(维度分 × 权重)，范围 1.0–5.0，保留两位小数。

## 2. 各维度 1–5 分锚点

- **意图准确度**：5=覆盖全部 confirmed 要素且无遗漏；3=覆盖主要要素但有次要缺失；1=偏离用户意图。
- **视觉美学**：5=符合沉浸/克制/诗意，留白与纵深到位；3=合格但平庸；1=杂乱/堆砌。
- **风格一致性**：5=完全符合 VB 固定规则与调色板；3=基本符合但有轻微违例；1=明显违例（霓虹/露脸/广告感）。
- **结构可信度**：5=场景自洽可信；3=基本合理但略牵强；1=逻辑矛盾/穿帮。
- **动态潜力**：5=缓慢、无缝、环境微动为主；3=动态合理但略生硬；1=突兀剪辑/快速运动。

## 3. 严重缺陷（Severe Defect）硬性否决

出现以下任一情况，无论总分多高，标记为 **FAIL** 且 `severe_defect=true`：

- 出现文字 / 标语 / Logo / UI 叠加。
- 商业广告式构图或强销售感、过度锐利。
- 过度饱和、霓虹色、赛博朋克高对比。
- 人物露脸特写。
- 明确违反该场景 `must_avoid` 中的任一条。
- 把 `source=model_inference` 且 `status=unconfirmed` 的推断**作为确定事实**强行视觉化（如把"可能渴望自由"画成破碎锁链）。
- 纯黑作主色（暗部非深海蓝延伸）。

## 4. 记录规范（保存全部，不只为最佳）

每次评估必须记录并**保存所有结果**，不得只保留最佳样本：

```json
{
  "scene_id": "B01",
  "run_id": "B01-2026-10-24-001",
  "model": "doubao-seedream（占位/未接入）",
  "prompt_version": "img-master-v1",
  "visual_bible_version": "v1",
  "scores": {
    "intent_accuracy": 4,
    "visual_aesthetics": 5,
    "style_consistency": 5,
    "structural_plausibility": 4,
    "motion_potential": 3
  },
  "weighted_total": 4.35,
  "severe_defect": false,
  "defect_notes": "",
  "status": "pass | fail",
  "errors": [],
  "notes": "暖调偏移略多，但整体沉浸。"
}
```

- `status`：`pass`（无严重缺陷且 weighted_total ≥ 3.0）或 `fail`。
- 所有 `run_id` 独立存档，便于回归对比与版本回溯。

## 5. 与 World Brief 的对应

- `intent_accuracy` 直接对照 `world_brief.intent` 的 confirmed 条目与场景 `must_include`/`must_avoid`。
- `style_consistency` 直接对照 `visual_bible_v1.md` / `style-profile.json` / `palette.json` 的固定规则。
- `prompt_version` 与 `visual_bible_version` 需在 World Brief 的 `generation` 与 `meta` 中记录，确保结果可复现。

## 6. 当前阶段说明（DEMO / MOCK 标注）

> 第三阶段**不实际调用任何图像/视频生成 API**。基准测试目前只验证：意图 → World Brief → 提示词组装 的正确性，以及人工对提示词可执行性的评估。涉及真实生成（豆包等）的字段（`generation.image_model` / `video_model` / `image_job_id` / `video_job_id` / `quality_score`）在真正接入前一律为 `null`，评分中的 `model` 标注为"占位/未接入"。任何生成结果在接入前都视为 **演示占位**，不得对外宣称已完成图像生成。
