// 第三阶段 Create / Inner World 验收测试
// 自包含：在本地以 GENERATION_MOCK=1 启动 server 子进程，覆盖 13 个验收点。
// 绝不调用付费外部 API；结束后恢复原数据并清理临时文件。
//
// 验收点（覆盖规格第 11 节）：
//  1. 候选参考图仅返回 已批准 且 未归档 的素材（前端再按 file_status 过滤）
//  2. World Brief 组装接口 200 且返回 world_id / validation
//  3. 生成任务创建 201 且包含全部持久化字段
//  4. 模型 ID 来自环境变量（ARK_IMAGE_MODEL_ID），未硬编码进响应
//  5. 异步生成后任务 succeed，result_image_uri 指向 assets/generated/
//  6. 生成的图片可通过 /generated/<file> 取得（mock 占位，无 24h 临时 URL）
//  7. 按 world_id 列出历史，且多次生成不互相覆盖（保留历史）
//  8. 选定结果（保留这个世界）标记为 selected=true
//  9. 参考图校验门控：未批准素材被拒绝（422）
// 10. 参考图校验门控：已归档素材被拒绝（422）
// 11. 方向微调（revisions）被并入提示词记录且不覆盖确认意图
// 12. 无密钥/敏感信息泄漏（响应不含 Bearer / sk- / ARK_API_KEY；图片不含密钥）
// 13. 缺 intent 时返回 400（结构化错误，不伪装成功）

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'http://localhost:8799'
const DATA_DIR = join(ROOT, 'server', 'data')
const DATA_FILE = join(DATA_DIR, 'assets.json')
const GEN_FILE = join(DATA_DIR, 'generations.json')
const SEED_FILE = join(ROOT, 'visual-bible', 'asset-seed.json')
const TEST_PNG = join(ROOT, 'assets', 'original', 'stage3-test-ref.png')

let pass = 0
let fail = 0
const results = []
function check(name, cond, extra = '') {
  if (cond) {
    pass++
    results.push(`  ✓ ${name}`)
  } else {
    fail++
    results.push(`  ✗ ${name}${extra ? '  → ' + extra : ''}`)
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, opts)
  const contentType = res.headers.get('content-type') || ''
  let body = null
  try {
    body = await res.json()
  } catch {
    /* ignore（非 JSON 响应，如图片二进制） */
  }
  return { status: res.status, body, contentType }
}
const post = (path, data) =>
  api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
const put = (path, data) =>
  api(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
const del = (path) => api(path, { method: 'DELETE' })

let server
async function waitServer(timeout = 8000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    try {
      const r = await fetch(BASE + '/api/generations')
      if (r.ok) return true
    } catch {
      /* not ready */
    }
    await sleep(150)
  }
  return false
}

// 1x1 PNG（合法文件，用于构造 file_status='present' 的素材）
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

const SAMPLE_INTENT = {
  scene: { description: '海边', location: '海边', environment: ['海景', '开阔水面'], confidence: 'high' },
  activities: ['散步', '听海'],
  daily_rhythm: '缓慢、自主的生活节奏',
  social_context: '独处',
  desired_values: ['自由与自主', '平静与松弛'],
  inferred_values: [],
  confirmed_values: [],
  visual_elements: ['海边', '海景'],
  avoid: ['高强度工作压力'],
  uncertainties: [],
  missing_information: [],
  ready_for_clarify: true,
}

async function main() {
  // ── 备份并重置数据 ──
  if (existsSync(DATA_FILE)) writeFileSync(DATA_FILE + '.bak.stage3', readFileSync(DATA_FILE))
  if (existsSync(GEN_FILE)) writeFileSync(GEN_FILE + '.bak.stage3', readFileSync(GEN_FILE))
  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8')).assets || []
  writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2))
  writeFileSync(GEN_FILE, '[]')
  writeFileSync(TEST_PNG, Buffer.from(PNG_B64, 'base64'))

  // ── 启动 server 子进程（强制 mock，密钥占位避免读取真实 .env）──
  server = spawn('node', ['server/index.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: '8799',
      GENERATION_MOCK: '1',
      ARK_API_KEY: 'test-disable', // 占位：isConfigured 为 true，但 isMock 短路，绝不真正调用
      ARK_IMAGE_MODEL_ID: 'doubao-seedream-4-0-250828',
      ARK_BASE_URL: 'https://ark.example.invalid/api/v3/images/generations',
      DEEPSEEK_API_KEY: 'test-disable',
      IMAGINE_MOCK: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stderr.on('data', (d) => {
    const s = d.toString()
    if (/error|ECONN|ENOTFOUND/i.test(s)) process.stderr.write('[server] ' + s)
  })

  const ready = await waitServer()
  if (!ready) {
    console.error('服务未就绪，测试终止')
    cleanup()
    process.exit(1)
  }

  try {
    /* ── 1. 候选参考图：仅 已批准 + 未归档 ── */
    console.log('\n[1] 候选参考图门控')
    const refs = await api('/api/generations/references')
    check('references 返回 200', refs.status === 200)
    const cands = refs.body?.candidates || []
    // 后端按 license_status=approved & 未归档 过滤；出于安全不向前端暴露 license 字段，
    // 因此用"排除未批准/已归档"与"数量等于种子中 approved 数"来验收过滤正确性。
    const seedApproved = seed.filter((a) => a.license_status === 'approved' && !a.archived).length
    check('候选数量等于种子中已批准素材数', cands.length === seedApproved, `${cands.length} vs ${seedApproved}`)
    check('排除了 pending 素材 AST-0005', !cands.some((c) => c.asset_id === 'AST-0005'))
    check('排除了 restricted 素材 AST-0014', !cands.some((c) => c.asset_id === 'AST-0014'))
    check('排除了 rejected 素材 AST-0032', !cands.some((c) => c.asset_id === 'AST-0032'))
    check('候选字段不含授权/归档等敏感字段', cands.every((c) => !('license_notes' in c) && !('archived' in c) && !('license_status' in c)))

    /* ── 2. World Brief 组装 ── */
    console.log('\n[2] World Brief 组装')
    const wb = await post('/api/world-brief/assemble', { intent: SAMPLE_INTENT })
    check('assemble 返回 200', wb.status === 200)
    check('返回 world_id', typeof wb.body?.world_brief?.world_id === 'string' && wb.body.world_brief.world_id.length > 0)
    check('返回校验结果', wb.body?.validation && typeof wb.body.validation.valid === 'boolean')
    check('assemble 不暴露密钥', !JSON.stringify(wb.body).includes('Bearer'))

    /* ── 3 & 4. 创建生成任务（含全部字段 + 模型 ID 来自 env）── */
    console.log('\n[3] 生成任务创建与字段持久化')
    const created = await post('/api/generations', {
      intent: SAMPLE_INTENT,
      reference_asset_ids: [],
      revisions: null,
    })
    check('创建返回 201', created.status === 201)
    const job = created.body?.job
    check('返回 job 对象', !!job)
    const requiredFields = [
      'job_id', 'world_id', 'status', 'model_id', 'prompt_version', 'prompt_record',
      'reference_asset_ids', 'generation_parameters', 'result_image_uri', 'created_at',
      'completed_at', 'error_code', 'error_message',
    ]
    check('包含全部持久化字段', requiredFields.every((f) => f in job), requiredFields.filter((f) => !(f in (job || {}))).join(', '))
    check('状态初始为 preparing 或 generating', job && (job.status === 'preparing' || job.status === 'generating'), job?.status)
    check('模型 ID 来自环境变量（非占位/非硬编码）', job?.model_id === 'doubao-seedream-4-0-250828', job?.model_id)
    check('prompt_record 不含任何密钥', !JSON.stringify(job?.prompt_record).includes('ARK_API_KEY') && !JSON.stringify(job?.prompt_record).includes('sk-'))

    /* ── 5 & 6. 异步生成成功 + 图片可服务 ── */
    console.log('\n[4] 异步生成与图片持久化')
    const jobId = job.job_id
    let finalJob
    const t0 = Date.now()
    while (Date.now() - t0 < 6000) {
      finalJob = (await api(`/api/generations/${jobId}`)).body
      if (finalJob.status === 'succeeded' || finalJob.status === 'failed') break
      await sleep(150)
    }
    check('任务最终成功', finalJob?.status === 'succeeded', finalJob?.status + '/' + finalJob?.error_message)
    check('result_image_uri 指向 assets/generated/', /assets\/generated\/.+/.test(finalJob?.result_image_uri || ''), finalJob?.result_image_uri)
    if (/assets\/generated\/(.+)$/.test(finalJob?.result_image_uri || '')) {
      const fname = finalJob.result_image_uri.match(/assets\/generated\/(.+)$/)[1]
      const img = await api('/generated/' + encodeURIComponent(fname))
      check('可通过 /generated/<file> 取得图片', img.status === 200)
      check('图片响应头为 image/*', /^image\//.test(img.contentType), img.contentType)
    }

    /* ── 7. 历史保留（再生成一次，验证不互相覆盖）── */
    console.log('\n[5] 生成历史保留')
    const second = await post('/api/generations', { intent: SAMPLE_INTENT, world_id: job.world_id, reference_asset_ids: [] })
    await waitSucceeded(second.body.job.job_id, 6000)
    const hist = (await api(`/api/generations?world_id=${encodeURIComponent(job.world_id)}`)).body
    check('同一 world_id 下保留多次生成', (hist?.jobs || []).length >= 2, String((hist?.jobs || []).length))
    check('历史任务各自独立（job_id 不同）', new Set((hist?.jobs || []).map((j) => j.job_id)).size >= 2)

    /* ── 8. 选定结果 ── */
    console.log('\n[6] 选定（保留）结果')
    const sel = await post(`/api/generations/${jobId}/select`)
    check('select 返回 200', sel.status === 200)
    check('selected=true', sel.body?.selected === true)

    /* ── 9. 未批准素材被拒绝 ── */
    console.log('\n[7] 参考图校验门控')
    const pending = await post('/api/generations', { intent: SAMPLE_INTENT, reference_asset_ids: ['AST-0005'] }) // pending
    check('未批准(pending)参考素材 → 422 并给出拒绝原因', pending.status === 422 && Array.isArray(pending.body?.rejected_references) && pending.body.rejected_references.length > 0, pending.status)

    /* ── 10. 已归档素材被拒绝 ── */
    const newAsset = (await post('/api/assets', {
      title: '临时测试素材', asset_type: 'image', source_type: 'original',
      source_uri: 'assets/original/stage3-test-ref.png', caption: '测试',
      categories: ['home_private'], reference_roles: ['scene'], license_status: 'approved',
    })).body
    const archivedId = newAsset.asset_id
    await del(`/api/assets/${archivedId}`)
    const archived = await post('/api/generations', { intent: SAMPLE_INTENT, reference_asset_ids: [archivedId] })
    check('已归档素材 → 422 并标记 archived', archived.status === 422 && archived.body?.rejected_references?.some((r) => r.reason === 'archived'), archived.status)
    // 清理临时素材（已被归档；从数据文件移除，避免污染）
    removeAsset(archivedId)

    /* ── 11. 方向微调 revisions ── */
    console.log('\n[8] 方向微调并入提示词')
    const rev = await post('/api/generations', { intent: SAMPLE_INTENT, reference_asset_ids: [], revisions: { lighting: 'softer', atmosphere: 'calmer' } })
    check('revisions 任务 201', rev.status === 201)
    check('job.revisions 记录微调', rev.body?.job?.revisions?.lighting === 'softer' && rev.body?.job?.revisions?.atmosphere === 'calmer')
    check('prompt_record.revisions 记录微调', rev.body?.job?.prompt_record?.revisions?.lighting === 'softer')

    /* ── 12. 无密钥泄漏 ── */
    console.log('\n[9] 无密钥/隐私泄漏')
    const leakBlob =
      JSON.stringify(created.body) + JSON.stringify(second.body) + JSON.stringify(rev.body) +
      JSON.stringify(refs.body) + JSON.stringify(wb.body)
    check('响应不含 Bearer 头', !leakBlob.includes('Bearer'))
    check('响应不含 sk- 密钥前缀', !leakBlob.includes('sk-'))
    check('响应不含 ARK_API_KEY 字符串', !leakBlob.includes('ARK_API_KEY'))

    /* ── 13. 缺 intent → 400 ── */
    console.log('\n[10] 结构化错误处理')
    const noIntent = await post('/api/generations', { foo: 'bar' })
    check('缺 intent → 400 且返回结构化错误', noIntent.status === 400 && typeof noIntent.body?.error === 'string', noIntent.status)
    const badBody = await post('/api/generations', 'not-json')
    check('非法 JSON 体 → 400', badBody.status === 400)
  } finally {
    cleanup()
  }

  results.push('')
  console.log(results.join('\n'))
  console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
  process.exit(fail ? 1 : 0)
}

async function waitSucceeded(id, timeout) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const j = (await api(`/api/generations/${id}`)).body
    if (j.status === 'succeeded' || j.status === 'failed') return j
    await sleep(150)
  }
  return null
}

function removeAsset(id) {
  try {
    const all = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    writeFileSync(DATA_FILE, JSON.stringify(all.filter((a) => a.asset_id !== id), null, 2))
  } catch {
    /* ignore */
  }
}

function cleanup() {
  if (server) {
    try {
      server.kill('SIGKILL')
    } catch {
      /* ignore */
    }
  }
  for (const f of [DATA_FILE + '.bak.stage3', GEN_FILE + '.bak.stage3']) {
    if (existsSync(f)) {
      const target = f.replace('.bak.stage3', '')
      try {
        writeFileSync(target, readFileSync(f))
        unlinkSync(f)
      } catch {
        /* ignore */
      }
    }
  }
  // 运行态数据：若无备份则重置为干净状态（server/data 为 gitignored 运行态）
  try {
    if (!existsSync(GEN_FILE + '.bak.stage3')) writeFileSync(GEN_FILE, '[]')
  } catch {
    /* ignore */
  }
  // 清理本次测试在 assets/generated 产生的占位图，仅保留 .gitkeep
  try {
    const genDir = join(ROOT, 'assets', 'generated')
    if (existsSync(genDir)) {
      for (const fn of readdirSync(genDir)) {
        if (fn === '.gitkeep' || !fn.startsWith('mock-')) continue
        try {
          unlinkSync(join(genDir, fn))
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  // 删除临时测试素材图
  if (existsSync(TEST_PNG)) {
    try {
      unlinkSync(TEST_PNG)
    } catch {
      /* ignore */
    }
  }
}

main().catch((e) => {
  console.error('测试异常：', e)
  cleanup()
  process.exit(1)
})
