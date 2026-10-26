// 生成任务持久化（开发期 JSON 文件；沿用 assetLibrary 的轻量模式，不引入数据库）。
// 记录生成作业与结果图像本地路径，保留历史以支持"重新生成"而不丢失早期结果。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const DATA_DIR = join(HERE, 'data')
const DATA_FILE = join(DATA_DIR, 'generations.json')

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, '[]')
}
function loadAll() {
  ensureStore()
  try {
    const a = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}
function saveAll(arr) {
  ensureStore()
  writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2))
}

export function genJobId() {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createJob(input) {
  const job = {
    job_id: input.job_id || genJobId(),
    world_id: input.world_id || null,
    status: 'preparing',
    model_id: input.model_id || null,
    prompt_version: input.prompt_version || null,
    prompt_record: input.prompt_record || null,
    reference_asset_ids: Array.isArray(input.reference_asset_ids) ? input.reference_asset_ids : [],
    generation_parameters: input.generation_parameters || null,
    revisions: input.revisions || null,
    result_image_uri: null,
    selected: false,
    created_at: new Date().toISOString(),
    completed_at: null,
    error_code: null,
    error_message: null,
  }
  const all = loadAll()
  all.push(job)
  saveAll(all)
  return job
}

export function updateJob(jobId, patch) {
  const all = loadAll()
  const idx = all.findIndex((j) => j.job_id === jobId)
  if (idx < 0) return null
  all[idx] = { ...all[idx], ...patch }
  saveAll(all)
  return all[idx]
}

export function getJob(jobId) {
  return loadAll().find((j) => j.job_id === jobId) || null
}

export function listByWorld(worldId) {
  return loadAll().filter((j) => j.world_id === worldId || (worldId === null && j.world_id === null))
}

export function selectJob(jobId, selected = true) {
  return updateJob(jobId, { selected })
}
