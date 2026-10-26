// Visual Asset Library — 服务端数据层（开发期）
// 轻量持久化：结构化 JSON 元数据 + 本地素材目录（无数据库）。
// 不存储图片 Base64；仅存路径/URI。真实图文件在 assets/{original,thumbnails,generated}/。
// 暴露：CRUD、搜索、校验，以及后续生成流程所需的服务方法。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SERVER_DIR, '..')
const DATA_DIR = join(SERVER_DIR, 'data')
const DATA_FILE = join(DATA_DIR, 'assets.json')
const SEED_FILE = join(ROOT, 'visual-bible', 'asset-seed.json')
const CATEGORIES_FILE = join(ROOT, 'visual-bible', 'asset-categories.json')
const BENCHMARK_FILE = join(ROOT, 'visual-bible', 'benchmark-scenes.json')

const ASSET_TYPES = ['image', 'video', 'other']
const SOURCE_TYPES = ['original', 'licensed', 'generated', 'pending_review']
const LICENSE_STATUSES = ['approved', 'pending', 'restricted', 'rejected']
// v1.1：新增 lighting / material 两个参考角色（第一批素材分析需要；向后兼容，不影响既有记录）
const REFERENCE_ROLES = ['scene', 'style', 'composition', 'motion', 'lighting', 'material']
// v1.1：草稿复核状态。draft = AI 生成待人工复核；approved = 人工已确认。既有记录缺省视为 approved。
const REVIEW_STATUSES = ['draft', 'approved']

let _categories = null
let _benchmarkIds = null

function loadCategories() {
  if (!_categories) {
    try {
      _categories = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8')).categories.map((c) => c.id)
    } catch {
      _categories = []
    }
  }
  return _categories
}

function loadBenchmarkIds() {
  if (!_benchmarkIds) {
    try {
      _benchmarkIds = new Set(JSON.parse(readFileSync(BENCHMARK_FILE, 'utf8')).scenes.map((s) => s.scene_id))
    } catch {
      _benchmarkIds = new Set()
    }
  }
  return _benchmarkIds
}

/* ───────────────────────── 持久化 ───────────────────────── */

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) {
    let seed = []
    try {
      seed = JSON.parse(readFileSync(SEED_FILE, 'utf8')).assets || []
    } catch {
      seed = []
    }
    writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2))
  }
}

function loadAll() {
  ensureStore()
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveAll(arr) {
  ensureStore()
  writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2))
}

function genId() {
  const existing = new Set(loadAll().map((a) => a.asset_id))
  let id
  do {
    id = 'AST-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  } while (existing.has(id))
  return id
}

function fileStatus(asset) {
  if (!asset || !asset.source_uri) return 'no_uri'
  return existsSync(join(ROOT, asset.source_uri)) ? 'present' : 'missing'
}

/* ───────────────────────── 校验 ───────────────────────── */

function arrOfStr(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : null
}

function validateFields(input, isUpdate) {
  const errors = []
  const data = {}
  const has = (k) => k in input

  if (!isUpdate || has('title')) {
    if (typeof input.title !== 'string' || !input.title.trim()) errors.push('title 必填且为字符串')
    else data.title = input.title.trim()
  }
  if (!isUpdate || has('asset_type')) {
    if (!ASSET_TYPES.includes(input.asset_type)) errors.push(`asset_type 必须属于 ${ASSET_TYPES.join('/')}`)
    else data.asset_type = input.asset_type
  }
  if (!isUpdate || has('source_type')) {
    if (!SOURCE_TYPES.includes(input.source_type)) errors.push(`source_type 必须属于 ${SOURCE_TYPES.join('/')}`)
    else data.source_type = input.source_type
  }
  if (!isUpdate || has('license_status')) {
    if (!LICENSE_STATUSES.includes(input.license_status)) errors.push(`license_status 必须属于 ${LICENSE_STATUSES.join('/')}`)
    else data.license_status = input.license_status
  }
  if (!isUpdate || has('categories')) {
    const c = arrOfStr(input.categories)
    if (!c || c.length === 0) errors.push('categories 至少包含一个分类')
    else {
      const bad = c.filter((x) => !loadCategories().includes(x))
      if (bad.length) errors.push('未知分类: ' + bad.join(','))
      else data.categories = c
    }
  }
  if (!isUpdate || has('reference_roles')) {
    const r = arrOfStr(input.reference_roles)
    if (!r || r.length === 0) errors.push('reference_roles 至少包含一个参考用途')
    else {
      const bad = r.filter((x) => !REFERENCE_ROLES.includes(x))
      if (bad.length) errors.push('未知参考用途: ' + bad.join(','))
      else data.reference_roles = r
    }
  }
  if (!isUpdate || has('caption')) {
    data.caption = typeof input.caption === 'string' ? input.caption : ''
  }
  if (has('source_uri')) data.source_uri = typeof input.source_uri === 'string' ? input.source_uri : null
  if (has('thumbnail_uri')) data.thumbnail_uri = typeof input.thumbnail_uri === 'string' ? input.thumbnail_uri : null
  for (const t of ['scene_tags', 'activity_tags', 'visual_tags', 'mood_tags']) {
    if (has(t)) {
      const a = arrOfStr(input[t])
      if (!a) errors.push(`${t} 必须为字符串数组`)
      else data[t] = a
    }
  }
  if (has('license_notes')) data.license_notes = typeof input.license_notes === 'string' ? input.license_notes : ''
  if (has('review_status')) {
    if (!REVIEW_STATUSES.includes(input.review_status)) errors.push(`review_status 必须属于 ${REVIEW_STATUSES.join('/')}`)
    else data.review_status = input.review_status
  }
  if (has('draft_metadata')) {
    if (input.draft_metadata === null || input.draft_metadata === undefined) data.draft_metadata = null
    else if (typeof input.draft_metadata === 'object' && !Array.isArray(input.draft_metadata)) data.draft_metadata = input.draft_metadata
    else errors.push('draft_metadata 必须为对象或 null')
  }
  if (has('quality_score')) {
    if (input.quality_score === null || input.quality_score === undefined || input.quality_score === '') data.quality_score = null
    else if (typeof input.quality_score === 'number' && isFinite(input.quality_score)) data.quality_score = input.quality_score
    else errors.push('quality_score 必须为数字或 null')
  }
  if (has('benchmark_scene_ids')) {
    const a = arrOfStr(input.benchmark_scene_ids)
    if (!a) errors.push('benchmark_scene_ids 必须为字符串数组')
    else {
      const bad = a.filter((x) => !loadBenchmarkIds().has(x))
      if (bad.length) errors.push('未知基准场景 ID: ' + bad.join(','))
      else data.benchmark_scene_ids = a
    }
  }
  return { ok: errors.length === 0, errors, data }
}

/* ───────────────────────── CRUD ───────────────────────── */

export function createAsset(input = {}) {
  const v = validateFields(input, false)
  if (!v.ok) return { ok: false, errors: v.errors }
  const now = new Date().toISOString()
  const asset = {
    asset_id: genId(),
    title: v.data.title,
    asset_type: v.data.asset_type,
    source_type: v.data.source_type,
    source_uri: v.data.source_uri ?? null,
    thumbnail_uri: v.data.thumbnail_uri ?? null,
    caption: v.data.caption || '',
    categories: v.data.categories,
    scene_tags: v.data.scene_tags || [],
    activity_tags: v.data.activity_tags || [],
    visual_tags: v.data.visual_tags || [],
    mood_tags: v.data.mood_tags || [],
    reference_roles: v.data.reference_roles,
    license_status: v.data.license_status,
    license_notes: v.data.license_notes || '',
    quality_score: v.data.quality_score ?? null,
    benchmark_scene_ids: v.data.benchmark_scene_ids || [],
    review_status: v.data.review_status || 'approved',
    draft_metadata: v.data.draft_metadata ?? null,
    created_at: now,
    updated_at: now,
    archived: false,
  }
  const all = loadAll()
  all.push(asset)
  saveAll(all)
  return { ok: true, asset }
}

export function getAsset(id) {
  const a = loadAll().find((x) => x.asset_id === id)
  if (!a) return null
  return { ...a, file_status: fileStatus(a) }
}

export function updateAsset(id, patch = {}) {
  const all = loadAll()
  const idx = all.findIndex((x) => x.asset_id === id)
  if (idx < 0) return { ok: false, errors: ['asset_not_found'] }
  const v = validateFields(patch, true)
  if (!v.ok) return { ok: false, errors: v.errors }
  const merged = { ...all[idx], ...v.data, updated_at: new Date().toISOString() }
  all[idx] = merged
  saveAll(all)
  return { ok: true, asset: { ...merged, file_status: fileStatus(merged) } }
}

export function archiveAsset(id) {
  const all = loadAll()
  const idx = all.findIndex((x) => x.asset_id === id)
  if (idx < 0) return { ok: false, errors: ['asset_not_found'] }
  all[idx].archived = true
  all[idx].updated_at = new Date().toISOString()
  saveAll(all)
  return { ok: true, asset: { ...all[idx], file_status: fileStatus(all[idx]) } }
}

export function restoreAsset(id) {
  const all = loadAll()
  const idx = all.findIndex((x) => x.asset_id === id)
  if (idx < 0) return { ok: false, errors: ['asset_not_found'] }
  all[idx].archived = false
  all[idx].updated_at = new Date().toISOString()
  saveAll(all)
  return { ok: true, asset: { ...all[idx], file_status: fileStatus(all[idx]) } }
}

/* ───────────────────────── 搜索 / 筛选 ───────────────────────── */

export function searchAssets(opts = {}) {
  const {
    q = '',
    category = '',
    reference_role = '',
    license_status = '',
    review_status = '',
    tag = '',
    benchmark_scene_id = '',
    include_archived = false,
  } = opts
  const ql = q.trim().toLowerCase()
  const tl = tag.trim().toLowerCase()
  const all = loadAll()
  const out = all.filter((a) => {
    if (a.archived && !include_archived) return false
    if (category && !(a.categories || []).includes(category)) return false
    if (reference_role && !(a.reference_roles || []).includes(reference_role)) return false
    if (license_status && a.license_status !== license_status) return false
    if (review_status && (a.review_status || 'approved') !== review_status) return false
    if (benchmark_scene_id && !(a.benchmark_scene_ids || []).includes(benchmark_scene_id)) return false
    if (ql) {
      const hay = (a.title + ' ' + (a.caption || '')).toLowerCase()
      if (!hay.includes(ql)) return false
    }
    if (tl) {
      const tags = [].concat(a.scene_tags, a.activity_tags, a.visual_tags, a.mood_tags).map((x) => String(x).toLowerCase())
      if (!tags.includes(tl)) return false
    }
    return true
  })
  return out.map((a) => ({ ...a, file_status: fileStatus(a) }))
}

export function getAssetsForBenchmark(sceneId) {
  return searchAssets({ benchmark_scene_id: sceneId })
}

/* ───────────────────────── 后续生成流程服务方法 ───────────────────────── */

export function validateAssetForGeneration(id) {
  const a = loadAll().find((x) => x.asset_id === id)
  if (!a) return { valid: false, reasons: ['asset_not_found'], asset: null }
  const reasons = []
  if (a.archived) reasons.push('archived')
  if (a.license_status !== 'approved') reasons.push(`license_not_approved(${a.license_status})`)
  if (a.asset_type === 'other') reasons.push('unsupported_type')
  return { valid: reasons.length === 0, reasons, asset: a }
}

export function buildReferenceSelection(assetIds = [], roleMap = {}) {
  const groups = { scene: [], style: [], composition: [], motion: [] }
  const invalid = []
  for (const id of assetIds) {
    const a = loadAll().find((x) => x.asset_id === id)
    if (!a) {
      invalid.push({ asset_id: id, reason: 'not_found' })
      continue
    }
    if (a.archived) {
      invalid.push({ asset_id: id, reason: 'archived' })
      continue
    }
    const gen = validateAssetForGeneration(id)
    const role = roleMap[id] || (a.reference_roles && a.reference_roles[0]) || 'scene'
    if (!groups[role]) groups[role] = []
    groups[role].push({
      asset_id: id,
      title: a.title,
      source_uri: a.source_uri,
      usable: gen.valid,
      reason: gen.valid ? null : gen.reasons.join(','),
    })
  }
  return {
    groups,
    invalid,
    generated_at: new Date().toISOString(),
    note: '仅 license_status=approved 且未归档的素材默认进入正式生成参考；未授权/归档素材标记为不可用于生成，不进入生产输入。',
  }
}

/* ───────────────────────── 元数据 ───────────────────────── */

/* ───────────────────────── 草稿导入（AI 元数据 → 人审工作流） ───────────────────────── */

// 字段含义见 docs/doubao-model-capability-audit.md 与 data/visual-assets/asset-metadata-draft.json。
// 规则：草稿导入一律 license_status=pending、source_type=pending_review、review_status=draft；
// benchmark 建议仅写入 draft_metadata.suggested_benchmark_scene_ids，人工确认后再提升到 benchmark_scene_ids。
const DRAFT_ONLY_FIELDS = [
  'original_filename', 'scene_description', 'composition_description', 'lighting_description',
  'color_palette', 'materials_and_textures', 'mood', 'suggested_generation_use',
  'potential_quality_issues', 'suggested_benchmark_scene_ids', 'metadata_confidence', 'category', 'tags',
]

export function importDrafts(drafts, opts = {}) {
  const dryRun = opts.dry_run === true
  if (!Array.isArray(drafts)) return { ok: false, errors: ['drafts 必须为数组'] }
  const existing = loadAll()
  const seenIds = new Set(existing.map((a) => a.asset_id))
  const seenUris = new Set(existing.map((a) => a.source_uri).filter(Boolean))
  const results = []
  const errors = []
  const toCreate = []
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i] || {}
    const idxLabel = `#${i}${d.asset_id ? '(' + d.asset_id + ')' : ''}`
    if (!d.asset_id || typeof d.asset_id !== 'string') {
      errors.push(`${idxLabel} 缺少 asset_id`)
      results.push({ index: i, ok: false, reason: 'missing_asset_id' })
      continue
    }
    if (seenIds.has(d.asset_id)) {
      errors.push(`${idxLabel} asset_id 与现有素材或批内重复`)
      results.push({ index: i, ok: false, reason: 'duplicate_asset_id' })
      continue
    }
    if (d.source_uri && seenUris.has(d.source_uri)) {
      errors.push(`${idxLabel} source_uri 已存在于素材库（重复导入）`)
      results.push({ index: i, ok: false, reason: 'duplicate_source_uri' })
      continue
    }
    const tags = d.tags && typeof d.tags === 'object' ? d.tags : {}
    const core = {
      asset_id: d.asset_id,
      title: typeof d.title === 'string' && d.title.trim() ? d.title : d.original_filename || d.asset_id,
      asset_type: d.asset_type || 'image',
      source_type: 'pending_review',
      source_uri: typeof d.source_uri === 'string' ? d.source_uri : null,
      thumbnail_uri: null,
      caption: typeof d.caption === 'string' ? d.caption : '',
      categories: Array.isArray(d.categories) && d.categories.length ? d.categories : (d.category ? [d.category] : []),
      scene_tags: tags.scene_tags || [],
      activity_tags: tags.activity_tags || [],
      visual_tags: tags.visual_tags || [],
      mood_tags: tags.mood_tags || [],
      reference_roles: d.reference_roles || [],
      license_status: 'pending',
      license_notes: 'AI 草稿导入：来源/版权未知，待人工核实',
      quality_score: null,
      benchmark_scene_ids: [], // 建议值不直接提升，见 draft_metadata
      review_status: 'draft',
      draft_metadata: {
        original_filename: d.original_filename || null,
        scene_description: d.scene_description || null,
        composition_description: d.composition_description || null,
        lighting_description: d.lighting_description || null,
        color_palette: d.color_palette || null,
        materials_and_textures: d.materials_and_textures || null,
        mood: d.mood || null,
        suggested_generation_use: d.suggested_generation_use || null,
        potential_quality_issues: d.potential_quality_issues || null,
        suggested_benchmark_scene_ids: Array.isArray(d.suggested_benchmark_scene_ids) ? d.suggested_benchmark_scene_ids : [],
        metadata_confidence: d.metadata_confidence || null,
      },
    }
    // 保留草稿文件中的其他未知字段，避免信息丢失
    for (const k of Object.keys(d)) {
      if (!(k in core) && !DRAFT_ONLY_FIELDS.includes(k) && k !== 'review_status' && k !== 'draft_metadata') {
        core.draft_metadata[k] = d[k]
      }
    }
    const v = validateFields(core, false)
    if (!v.ok) {
      errors.push(`${idxLabel} 校验失败: ${v.errors.join('; ')}`)
      results.push({ index: i, ok: false, reason: 'validation_failed', errors: v.errors })
      continue
    }
    // 使用固定 asset_id 而非 genId
    const now = new Date().toISOString()
    const asset = { ...v.data, asset_id: d.asset_id, created_at: now, updated_at: now, archived: false }
    seenIds.add(asset.asset_id)
    if (asset.source_uri) seenUris.add(asset.source_uri)
    toCreate.push(asset)
    results.push({ index: i, ok: true, asset_id: asset.asset_id, file_status: fileStatus(asset) })
  }
  if (!dryRun && toCreate.length) {
    // 部分成功语义：校验通过的记录写入，失败记录仅报告
    saveAll(existing.concat(toCreate))
  }
  return {
    ok: errors.length === 0,
    dry_run: dryRun,
    total: drafts.length,
    imported: toCreate.length,
    errors,
    results,
  }
}

/* ───────────────────────── 参考图解析（生成流程用） ───────────────────────── */

const REF_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
}
const REF_FORMATS = Object.keys(REF_MIME)
const MAX_REF_BYTES = 30 * 1024 * 1024 // 单图 ≤30MB（与官方约束一致）

export function getAssetFileMeta(id) {
  const a = loadAll().find((x) => x.asset_id === id)
  if (!a || !a.source_uri) return { asset: a, exists: false }
  const full = join(ROOT, a.source_uri)
  if (!existsSync(full)) return { asset: a, exists: false }
  const ext = full.slice(full.lastIndexOf('.')).toLowerCase()
  let size = 0
  try {
    size = statSync(full).size
  } catch {
    /* ignore */
  }
  return { asset: a, exists: true, ext, size, full, mime: REF_MIME[ext] || null }
}

export function encodeAssetToDataUri(id) {
  const meta = getAssetFileMeta(id)
  if (!meta.exists || !meta.mime) return { ok: false, reason: 'file_missing_or_unsupported' }
  if (meta.size > MAX_REF_BYTES) return { ok: false, reason: 'file_too_large', size: meta.size }
  const b64 = readFileSync(meta.full).toString('base64')
  return { ok: true, dataUri: `data:${meta.mime};base64,${b64}` }
}

/**
 * 仅放行：已批准(approved)、未归档、文件存在、格式与大小合规 的素材。
 * @param {string[]} assetIds 选中的素材 ID
 * @param {object} [opts] { maxCount, roleMap }
 */
export function resolveApprovedReferences(assetIds = [], opts = {}) {
  const maxCount = opts.maxCount || 10
  const roleMap = opts.roleMap || {}
  const used = []
  const rejected = []
  const all = loadAll()
  const seen = new Set()
  for (const id of assetIds) {
    const meta = getAssetFileMeta(id)
    const asset = meta.asset
    if (!asset) {
      rejected.push({ asset_id: id, reason: 'not_found' })
      continue
    }
    if (asset.archived) {
      rejected.push({ asset_id: id, reason: 'archived' })
      continue
    }
    if (asset.license_status !== 'approved') {
      rejected.push({ asset_id: id, reason: `license_not_approved(${asset.license_status})` })
      continue
    }
    if (!meta.exists) {
      rejected.push({ asset_id: id, reason: 'file_missing' })
      continue
    }
    if (!meta.mime) {
      rejected.push({ asset_id: id, reason: 'unsupported_format' })
      continue
    }
    if (meta.size > MAX_REF_BYTES) {
      rejected.push({ asset_id: id, reason: 'file_too_large' })
      continue
    }
    if (seen.has(id)) {
      rejected.push({ asset_id: id, reason: 'duplicate' })
      continue
    }
    seen.add(id)
    used.push({
      asset_id: id,
      role: roleMap[id] || (asset.reference_roles && asset.reference_roles[0]) || 'scene',
      title: asset.title,
      source_uri: asset.source_uri,
      ext: meta.ext,
      mime: meta.mime,
    })
  }
  if (used.length > maxCount) {
    const overflow = used.splice(maxCount)
    for (const o of overflow) rejected.push({ asset_id: o.asset_id, reason: 'exceeds_model_limit' })
  }
  return { ok: used.length > 0, used, rejected }
}

export function getLibraryMeta() {
  let cat = { categories: [], reference_roles: [] }
  try {
    cat = JSON.parse(readFileSync(CATEGORIES_FILE, 'utf8'))
  } catch {
    /* ignore */
  }
  let bm = { scenes: [] }
  try {
    bm = JSON.parse(readFileSync(BENCHMARK_FILE, 'utf8'))
  } catch {
    /* ignore */
  }
  return {
    categories: cat.categories,
    reference_roles: cat.reference_roles,
    benchmark_scenes: bm.scenes.map((s) => ({ scene_id: s.scene_id, title: s.title, category: s.category })),
    asset_types: ASSET_TYPES,
    source_types: SOURCE_TYPES,
    license_statuses: LICENSE_STATUSES,
  }
}

export const VALIDATION = { ASSET_TYPES, SOURCE_TYPES, LICENSE_STATUSES, REFERENCE_ROLES, REVIEW_STATUSES }
