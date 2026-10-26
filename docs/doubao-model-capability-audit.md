# 豆包（Doubao / Seedream）图像生成模型能力审计

- 项目：《自我的彼岸》
- 审计日期：2026-10-24
- 审计人：开发期 AI 辅助核查
- **结论先行：本项目 `.env` 中未配置 `DOUBAO_IMAGE_MODEL`，当前未确定具体模型 ID。以下能力表按官方文档列出的 Seedream 各版本分别记录，接入前必须先选定一个模型 ID 并写入 `.env`。**

---

## 1. 当前项目配置状态

| 项 | 状态 |
|---|---|
| `DOUBAO_IMAGE_MODEL` | **未配置**（`.env.example` 中为注释占位，`.env` 中不存在） |
| `DOUBAO_VIDEO_MODEL` | 未配置（占位） |
| 已有集成代码 | 无。服务端仅有 DeepSeek（`/api/imagine/conversation`）与 World Brief 组装（`/api/world-brief/assemble`）；素材库预留接口（`buildReferenceSelection` 等）不调用任何生成 API |
| 现有密钥 | 仅 `DEEPSEEK_API_KEY`（仅服务端读取，未泄漏到前端/日志） |

**安全说明**：本审计不包含、也不应包含任何真实 API Key。

## 2. 官方文档确认的模型 ID（截至 2026-10-24）

来源：火山方舟官方文档「图片生成教程」（ark.volcengine.com / console.volcengine.com，见文末链接）。

| 模型名称 | Model ID | 文生图 | 单/多图生图 | 文生组图 | 单/多图生组图 | 交互编辑 | 图层拆分 |
|---|---|---|---|---|---|---|---|
| Seedream 5.0 pro | `doubao-seedream-5-0-pro-260628` | ✓ | ✓ | 暂不支持 | 暂不支持 | ✓ | ✓ |
| Seedream 5.0 flash | `doubao-seedream-5-0-flash-260915` | ✓ | ✓ | 暂不支持 | 暂不支持 | ✓ | ✓ |
| Seedream 5.0 lite | `doubao-seedream-5-0-260128`（同时支持 `doubao-seedream-5-0-lite-260128`） | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Seedream 4.5 | `doubao-seedream-4-5-251128` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Seedream 4.0 | `doubao-seedream-4-0-250828` | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

⚠️ **不要假设所有 Seedream 版本参数一致**：组图生成（`sequential_image_generation`）在 5.0 pro/flash 上暂不支持；提示词优化（`optimize_prompt_options`）与多语种提示词仅部分版本支持。

## 3. 已确认的 API 能力（官方文档）

### 3.1 接口与鉴权
- 端点（火山方舟）：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`
- 鉴权：`Authorization: Bearer $ARK_API_KEY`（API Key 在方舟控制台创建；须配置为环境变量，不得写入前端）
- 地域：文档示例为 `cn-beijing`；另有 LAS 算子调用路径（`operator.las.<region>.volces.com`），Base URL 随地域变化。

### 3.2 输入（参考图）
- **文生图**：仅 `prompt` 即可，所有版本支持。
- **图生图 / 多图融合**：`image` 参数，支持字符串（单张）或数组（多张）。
- **参考图数量上限**：pro / flash / 4.0 / 4.5 最多 **10 张**；5.0 lite 最多 **14 张**（官方参数表）。
- **输入格式**：URL（http/https）与 **Base64** 均支持。
- **图片格式**：jpeg / png / webp / bmp / tiff / gif / heic / heif。
- **输入图限制**：宽高比（宽/高）∈ [1/16, 16]；宽高像素 > 14px；单张 ≤ 30MB；总像素范围 [196, 6000×6000（3600 万）]（宽×高乘积限制）。
- **提示词**：中英文均支持（5.0 pro/flash 额外支持十余语种）；建议中文 ≤ 300 字 / 英文 ≤ 600 词。

### 3.3 输出
- **尺寸控制**：`size` 支持档位（1K / 1.5K / 2K，4.0 支持 4K）与显式像素值（如 `2048x2048`）/ 宽高比写法（如 `16:9`，以官方参数表为准）。
- **输出格式**：`output_format`: png / jpeg（5.0 pro/flash）；4.x 支持 png / jpeg / webp。
- **组图生成**：`sequential_image_generation="auto"` + `sequential_image_generation_options={"max_images": N}`（仅 5.0 lite / 4.5 / 4.0 支持）。
- **响应格式**：`response_format`:
  - `url`：返回图片链接，**生成后 24 小时内失效**（须及时转存）；
  - `b64_json`：返回 Base64 字符串。
- **其他参数**：`watermark`（水印开关）、`seed`、5.0 pro/flash 支持 `layer_decomposition`（图层拆分，1 底图 + 最多 16 图层）与 `optimize_prompt_options`（standard/fast 提示词优化）。

### 3.4 限制（可从公开文档核实的部分）
- 需开通火山方舟服务并创建 API Key；模型调用按量计费（**实际价格需登录控制台确认，本文档不臆造数字**）。
- 限流：5.0 pro/flash 公开页标注 IPM（张/分钟）为 500 / 500（以控制台配额为准）。
- 组图能力与提示词优化存在版本差异（见第 2 节表）。

## 4. 未能确认 / 需真实 API 测试验证的项

以下内容**未在本次静态核查中确证**，列为待验证：

1. 各版本 `size` 参数的**完整合法取值清单**（显式像素与宽高比写法的确切格式）——需以控制台「模型详情 → 参数」或一次真实调用报错信息为准。
2. Base64 输入的具体编码约定（是否需要 data URI 前缀）——官方示例多用 URL。
3. 当前账号实际可用的模型列表与配额（部分模型可能需申请开通）。
4. `guidance_scale` / `seed` 等参数在具体版本上的取值范围。
5. URL 失效时间在不同版本/地域是否统一为 24 小时。

**成本预估（如做一次最小真实调用测试）**：单张 2K 文生图一次调用量级为分/角级人民币（具体以控制台价格页为准），测试计划（见 `docs/reference-image-test-plan-B01-B08-B20.md`）最多约 10–12 次调用，成本可控；**在获得账号与密钥前不执行**。

## 5. 对本项目的落点建议

1. 先在 `.env` 增加 `DOUBAO_IMAGE_MODEL=` 与 `ARK_API_KEY=`（服务端专用），**选定一个模型 ID**（建议先选 Seedream 4.5 或 5.0 lite——支持组图且能力完整；若只要单图，5.0 pro 画质最佳）。
2. 本项目参考图输入走 `image` 数组（≤10 张），配合素材库 `buildReferenceSelection` 的 `groups.scene/style/composition/motion` 输出组装。
3. 参考图必须是可公网访问的 URL（当前素材库本地路径需先转存对象存储/CDN）。
4. 生成结果若用 `response_format=url`，**24 小时内必须转存**到 `assets/generated/` 并把 URL 写回素材库。

## 6. 来源链接（核查日期 2026-10-24）

- 图片生成 API（方舟）：https://ark.volcengine.com/region:cn-beijing/docs/image-generation-api
- 图片生成教程（模型能力对比表）：https://ark.volcengine.com/docs/seedream-4-0-5-0 与 https://volcengine.com/docs/82379/1824121
- Seedream 5.0 pro/flash 教程：https://console.volcengine.com/ark/region:cn-beijing/docs/ark/seedream-5-0-pro
- 图像生成（Seedream 系列，LAS 算子）：https://www.volcengine.com/docs/6492/2172373
- 图片生成编辑（豆包 seedream 系列模型）：https://www.volcengine.com/docs/6492/2221472

> 注：火山引擎文档站为 JS 渲染页面，静态抓取仅能获得部分参数表内容；以上条目均来自搜索结果中官方域名的摘要与交叉印证。接入前建议在浏览器中复核一遍第 3 节各参数的最新取值。
