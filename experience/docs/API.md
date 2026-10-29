# API 接口边界（后续阶段契约，当前未实现）

Phase 1–2 只使用浏览器内存和程序场景，不发送分析/分享请求。.env.example 仅记录后续配置位置；Vite 客户端不读取 API Key。

建议后续保持两个服务端适配器：

| 计划端点 | 输入 | 校验后的输出 |
| --- | --- | --- |
| POST /api/text/ideal | idealRawText | Master Prompt TASK A1 JSON |
| POST /api/text/change | idealStructuredData, habitAnswers, dailyFreeText | TASK A2 JSON |
| POST /api/text/reflection | reflectionText | TASK A3 JSON |
| POST /api/media/image | image_prompt_en, negative_prompt_en | jobId, status, imageUrl |
| POST /api/media/video | idealImageUrl, change_video_prompt_en | jobId, status, videoUrl 或 fallback |
| POST /api/reflections | approvedText, keywords, consent: true | id，仅在明确确认且审核通过后存储 |
| GET /api/keywords | 当前用户明确表达的关键词（可选） | 匿名聚合关键词/频率；不足时返回空数组 |

所有生成任务统一 status: loading / success / error / fallback，失败提供 retry。真实 API 输出须服务端结构校验；错误不得返回密钥、堆栈或私人原文。共享服务需脱敏和明确授权，不能存储未授权的原始会话。摄像头为浏览器可选能力，与两类 AI 服务分开。
