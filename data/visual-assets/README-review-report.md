# 第一批参考素材 · AI 元数据草稿复核报告

- 生成时间：2026-10-24
- 草稿文件：`asset-metadata-draft.json`（同目录，v1）
- 状态：**全部为 AI 草稿，未经人工复核，不得进入生产**

## 概览

| 项 | 数量 |
|---|---|
| 发现图片 | 28 |
| 成功读取并分析 | 28 |
| 不可读 / 缺失 | 0 |
| 重复文件（字面重复） | 0 |
| 近似重复（同场景） | 1 组：DRF-0001 / DRF-0003（建议二选一） |

## 建议分类分布

| 分类 | 数量 |
|---|---|
| home_private（居家与私人空间） | 6 |
| work_creation（工作与创造） | 6 |
| nature_freedom（自然与自由） | 8 |
| future_surreal（未来与超现实） | 8 |

注：分类按**图片内容**判定，与采集文件夹名一致；例外 DRF-0002 内容为画室（归 work_creation），存放在 A 文件夹中。

## 授权 / 来源

- **全部 28 条 `license_status = pending`**：来源为屏幕截图，无法从外观判断原始出处与版权，均缺少来源与授权信息。
- `source_type` 一律 `pending_review`；导入后不进入生成参考（`validateAssetForGeneration` 不通过）。

## 需人工复核的重点

1. DRF-0001 / DRF-0003：近似重复，二选一。
2. DRF-0002、DRF-0011：含清晰人物（DRF-0011 为多人近景），用作生成参考前确认授权语境；DRF-0011 与 B09 的 must_avoid「人群」冲突。
3. DRF-0007：现代建筑，与 B18「老木屋」语境有偏差。
4. DRF-0013：滩涂/雪原归属不唯一（B01/B23 之间）。
5. DRF-0018：草色偏绿，作 B20 麦浪参考需在 prompt 中补金黄与人物。
6. DRF-0021：超现实体量与 B07/B24「安静低对比」约束存在张力，仅建议借色调。
7. 全部 28 条：来源与版权缺失，需补齐后方可批准。

## 导入方式

```bash
# 校验（不写入）
curl -X POST 'http://localhost:8787/api/assets/import-draft?dry_run=1' \
  -H 'Content-Type: application/json' \
  -d "$(node -e "console.log(JSON.stringify({drafts:require('./data/visual-assets/asset-metadata-draft.json').records}))")"
# 正式导入（review_status=draft，license_status=pending）
curl -X POST 'http://localhost:8787/api/assets/import-draft' -H 'Content-Type: application/json' -d 同上
```

导入后在素材库界面（assets.html）用「复核状态：待审核草稿」筛选，逐条编辑字段、确认分类/基准关联、核实来源授权，再通过编辑将 `review_status` 提升为 `approved`。基准建议值在 `draft_metadata.suggested_benchmark_scene_ids`，人工确认后手动写入 `benchmark_scene_ids`。
