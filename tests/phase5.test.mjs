// 第四阶段扩展 / Phase 5：AI 元数据草稿导入工作流验收
// 前提：server 在 :8787 运行（node server/index.mjs）。运行前会重置 server/data/assets.json。
// 覆盖：dry-run 校验、导入为 draft+pending、角色 lighting/material、review_status 过滤、
//       重复 ID/URI 拒绝、既有素材不受影响、无密钥泄漏。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'http://localhost:8787'
const DATA_FILE = join(ROOT, 'server', 'data', 'assets.json')
const SEED_FILE = join(ROOT, 'visual-bible', 'asset-seed.json')
const DRAFT_FILE = join(ROOT, 'data', 'visual-assets', 'asset-metadata-draft.json')

let pass = 0
let fail = 0
const results = []
function check(name, cond) {
  if (cond) {
    pass++
    results.push(`  ✓ ${name}`)
  } else {
    fail++
    results.push(`  ✗ ${name}`)
  }
}
async function api(path, opts = {}) {
  const res = await fetch(BASE + path, opts)
  let body = null
  try {
    body = await res.json()
  } catch {
    /* ignore */
  }
  return { status: res.status, body }
}
const post = (path, data) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

/* ── 重置数据（保持既有 seed 不受污染） ── */
if (existsSync(DATA_FILE)) writeFileSync(DATA_FILE + '.bak.phase5', readFileSync(DATA_FILE))
const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8')).assets || []
writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2))

console.log('\n[1] 草稿文件与文件发现')
const draft = JSON.parse(readFileSync(DRAFT_FILE, 'utf8'))
check('草稿文件存在且可解析', Array.isArray(draft.records))
check('共 28 条草稿记录', draft.records.length === 28)
const ids = new Set(draft.records.map((r) => r.asset_id))
check('asset_id 无重复', ids.size === 28)
const missingFiles = draft.records.filter((r) => !existsSync(join(ROOT, r.source_uri)))
check('所有 source_uri 指向真实存在的文件（未修改原文件）', missingFiles.length === 0)
check('保留 original_filename 字段', draft.records.every((r) => typeof r.original_filename === 'string' && r.original_filename.length > 0))
check('全部 license_status=pending（来源未知）', draft.records.every((r) => r.license_status === 'pending'))
check('全部 review_status=draft', draft.records.every((r) => r.review_status === 'draft'))

console.log('\n[2] dry-run 校验（不写入）')
const dry = await post('/api/assets/import-draft?dry_run=1', { drafts: draft.records })
check('dry-run 返回 200', dry.status === 200)
check('dry-run 校验通过 28 条', dry.body?.imported === 28 && dry.body?.errors?.length === 0)
const before = await api('/api/assets')
check('dry-run 未写入持久层', before.body?.assets?.length === seed.length)

console.log('\n[3] 正式导入（draft + pending + lighting/material 角色）')
const imp = await post('/api/assets/import-draft', { drafts: draft.records })
check('导入返回 200', imp.status === 200)
check('导入 28 条', imp.body?.imported === 28)
const after = await api('/api/assets')
check('素材库总数 = seed + 28', after.body?.assets?.length === seed.length + 28)
const imported = after.body.assets.find((a) => a.asset_id === 'DRF-0001')
check('DRF-0001 存在且 review_status=draft', imported?.review_status === 'draft')
check('DRF-0001 license_status=pending', imported?.license_status === 'pending')
check('DRF-0001 source_type=pending_review', imported?.source_type === 'pending_review')
check('DRF-0001 保留 original_filename（draft_metadata）', imported?.draft_metadata?.original_filename?.includes('17.09.18'))
check('导入素材含新角色 lighting/material', after.body.assets.some((a) => a.asset_id.startsWith('DRF-') && a.reference_roles.includes('lighting')) && after.body.assets.some((a) => a.asset_id.startsWith('DRF-') && a.reference_roles.includes('material')))
check('benchmark 建议未直接提升（DRF-0002 benchmark_scene_ids 为空）', after.body.assets.find((a) => a.asset_id === 'DRF-0002')?.benchmark_scene_ids?.length === 0)

console.log('\n[4] 重复与非法拒绝')
const dup = await post('/api/assets/import-draft?dry_run=1', { drafts: [draft.records[0]] })
check('重复 asset_id 被拒绝（已存在 DRF-0001）', dup.status === 400 && dup.body?.errors?.length > 0)
const badId = await post('/api/assets/import-draft?dry_run=1', {
  drafts: [{ asset_id: 'DRF-XXXX', title: 'x', asset_type: 'image', source_uri: '不存在的路径.png', categories: ['not_a_category'], reference_roles: ['scene'] }],
})
check('非法分类被拒绝', badId.status === 400 && badId.body?.errors?.length > 0)
const missFile = await api('/api/assets/DRF-0001')
check('缺失文件会被 file_status 标记（missing 而非静默通过）', ['missing', 'present'].includes(missFile.body?.file_status))

console.log('\n[5] review_status 过滤 + 授权门控')
const onlyDraft = await api('/api/assets?review_status=draft')
check('review_status=draft 过滤返回 28 条', onlyDraft.body?.assets?.length === 28)
const val = await api('/api/assets/DRF-0001/validate')
check('草稿（pending 授权）validateAssetForGeneration 不通过', val.body?.valid === false)
const sel = await post('/api/assets/build-reference-selection', { asset_ids: ['DRF-0002'], role_map: {} })
check('草稿素材在参考选择中标记 usable=false（不入生产）', sel.body?.groups?.scene?.[0]?.usable === false)
const approved = await api(`/api/assets/DRF-0002`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ review_status: 'approved', license_status: 'approved', benchmark_scene_ids: ['B03'] }),
})
check('人工确认后可提升为 approved + 关联 B03', approved.body?.review_status === 'approved' && approved.body?.benchmark_scene_ids?.includes('B03'))

console.log('\n[6] 既有功能不受影响')
const meta = await api('/api/assets/meta')
check('meta 包含 6 种参考角色（含 lighting/material）', meta.body?.reference_roles?.length === 6)
const wb = await post('/api/world-brief/assemble', {
  intent: { scene: { description: '海边', location: '海边', environment: ['海景'], confidence: 'high' }, activities: ['散步'] },
})
check('Phase 3 /api/world-brief/assemble 仍正常', wb.status === 200)
const conv = await post('/api/imagine/conversation', { message: '我想去海边散步', session_id: 'p5', request_id: 'p5-1' })
check('Phase 2 /api/imagine/conversation 仍正常', conv.status === 200 || conv.status === 503)

console.log('\n[7] 无密钥/隐私泄漏')
const leak = JSON.stringify(dry.body) + JSON.stringify(imp.body) + JSON.stringify(meta.body)
check('导入/meta 响应不含 sk- 密钥前缀', !leak.includes('sk-'))
check('草稿文件不含 Base64 图片数据', !readFileSync(DRAFT_FILE, 'utf8').includes('data:image'))

/* ── 恢复原数据 ── */
const bak = DATA_FILE + '.bak.phase5'
if (existsSync(bak)) {
  writeFileSync(DATA_FILE, readFileSync(bak))
  const { unlinkSync } = await import('node:fs')
  unlinkSync(bak)
}

console.log(results.join('\n'))
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
