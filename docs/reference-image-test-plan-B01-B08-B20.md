# B01 / B08 / B20 参考图对照测试计划（v1，未执行）

> 状态：**仅计划**。在配置 `DOUBAO_IMAGE_MODEL` 与 `ARK_API_KEY` 并确认账号配额之前不执行。预计成本见文末。

## 1. 目的

验证参考图对 World Brief + Visual Bible 生成质量的增益：B01（清晨独处的海岸）、B08（雨后的呼吸）、B20（麦浪里的午后）。

## 2. 固定变量（所有条件一致）

- 模型 ID：`$DOUBAO_IMAGE_MODEL`（**当前未配置**；选定后全程不变并记录）
- 提示词来源：Imagine 意图解析 → World Brief 组装 → Phase 3 提示词生成，prompt 版本号固定（记录 `visual_bible_version=v1` 与模板 hash）
- `size`：统一 `2048x2048`（或该模型支持的等价 1K/2K 档位，执行前以官方参数表核实）
- `response_format: url`、`watermark: false`、固定 `seed`（若该模型支持）
- 每条件每场景生成 **1 张**，共 3 场景 × ≤4 条件 = **≤12 次调用**
- 参考图须为公网可访问 URL（本地文件需先转存对象存储/CDN）

## 3. 参考图选择（小而精的子集）

| 场景 | 条件 B 的 scene 参考 | 条件 C 追加的 style 参考 | 条件 D 可选 composition 参考 |
|---|---|---|---|
| B01 | DRF-0015（悬崖单人剪影）或 DRF-0013（粉灰滩涂留白，二选一，人工先定） | DRF-0006（深青墙暮光——冷暖对比克制） | DRF-0013（若未用于 scene） |
| B08 | DRF-0019（雨后花园石径） | DRF-0014（山谷湖雾——低饱和冷调） | 不设 |
| B20 | DRF-0018（风吹草浪） | 暂无理想 style 图；可复用 DRF-0014 或留空并在报告中注明 | 不设 |

**不使用全部参考图**：每场景最多 2–3 张，避免多图融合稀释场景语义。

## 4. 条件矩阵

- **A 基线**：World Brief + Visual Bible，无参考图（`image` 缺省）
- **B**：A + 1 张 scene 参考（`image: [url]`）
- **C**：B + 1 张 style 参考（`image: [sceneUrl, styleUrl]`）
- **D（仅当所用模型支持且 C 显示风格/构图仍有偏差）**：C + 1 张 composition 参考

同一参考图 URL 与顺序在各场景间保持一致策略（scene 在前、style 在后）。

## 5. 评估记录表（每张生成结果一行）

按 `visual-bible/evaluation-rubric.md` 逐项打分：

1. 场景与意图准确度（must_include 命中 / must_avoid 违例）
2. 构图质量（留白、纵深、主体位置）
3. 视觉风格一致性（与 Visual Bible 低饱和蓝青基调的贴合）
4. 不想要的细节（霓虹、广告感、露脸、文字等）
5. 参考图是否带来可感知提升（B/C/D 相对 A 的差值）
6. 生成错误与关键参数（模型 ID、size、图片 URL、HTTP 错误码）

输出物：`docs/test-results-b01-b08-b20.md`（执行后填写），生成图归档至 `assets/generated/` 并登记进素材库。

## 6. 判定规则（预注册，防事后偏移）

- 参考图"有效"判定：条件 C 在 rubric 总分上相对条件 A 提升 ≥ 0.5（5 分制），且 must_avoid 违例不增加。
- 若 B 已接近满分，则 C/D 不再叠加，视为"单 scene 参考即足够"。

## 7. 成本与前提

- ≤12 次 2K 生成调用；单次按官方价格页计（执行前确认，预计总量在数元人民币量级）。
- 前提：① `.env` 已配置 `DOUBAO_IMAGE_MODEL`、`ARK_API_KEY`；② 账号已开通所选模型；③ 参考图已上传至可公网访问的存储。
- 本计划**尚未执行**，无任何"已生成/已验证"的结论。
