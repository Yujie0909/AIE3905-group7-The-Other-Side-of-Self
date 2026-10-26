// 第三阶段验证脚本（独立运行，无测试框架依赖）
// 覆盖：24 个唯一场景、Schema 校验（合法通过 / 缺字段拒绝 / 类型错误拒绝）、
// 适配器规则（未确认推断不自动确认、用户纠正移除冲突项）、前端无密钥泄漏、Phase1/2 路由不受影响。
// 运行：node tests/phase3.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import {
  adaptIntentToWorldBrief,
  assembleImagePrompt,
} from '../server/worldBriefAdapter.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

let pass = 0
let fail = 0
function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.error(`  ✗ ${name} ${extra}`)
  }
}

function loadJson(p) {
  return JSON.parse(readFileSync(join(ROOT, p), 'utf8'))
}

const schema = loadJson('schemas/world-brief.schema.json')
const scenesData = loadJson('visual-bible/benchmark-scenes.json')

/* ───────────────────────── 1. 24 个唯一场景 ───────────────────────── */
console.log('\n[1] 基准场景 B01–B24')
const scenes = scenesData.scenes
check('场景数量为 24', scenes.length === 24, `实际 ${scenes.length}`)
const ids = scenes.map((s) => s.scene_id)
check('scene_id 全部唯一', new Set(ids).size === 24, `去重后 ${new Set(ids).size}`)
const requiredSceneFields = ['scene_id', 'category', 'title', 'user_input', 'must_include', 'must_avoid', 'evaluation_focus', 'reference_asset_ids', 'visual_bible_version']
let allFields = true
for (const s of scenes) {
  for (const f of requiredSceneFields) {
    if (!(f in s)) { allFields = false; console.error(`    缺失字段 ${f} @ ${s.scene_id}`) }
  }
  if (!Array.isArray(s.must_include) || !s.must_include.length) allFields = false
  if (!Array.isArray(s.must_avoid) || !s.must_avoid.length) allFields = false
}
check('每个场景字段完整且 must_include/must_avoid 非空', allFields)
check('所有场景 visual_bible_version 为 v1', scenes.every((s) => s.visual_bible_version === 'v1'))

/* ───────────────────────── 2. Schema 校验 ───────────────────────── */
console.log('\n[2] World Brief Schema 校验（ajv）')
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

const sampleIntent = {
  scene: { description: '安静的海边清晨', location: '海边', environment: ['海景', '开阔水面'], confidence: 'high' },
  activities: ['听海浪', '独处'],
  daily_rhythm: '缓慢、自主的生活节奏',
  social_context: '独处',
  desired_values: ['平静与松弛', '自由与自主'],
  inferred_values: ['创造与表达'],
  confirmed_values: ['平静与松弛'],
  visual_elements: ['海边', '海景'],
  avoid: ['高强度工作压力', '拥挤或攀比的社交'],
  uncertainties: [],
  missing_information: [],
  ready_for_clarify: true,
}
const wb = adaptIntentToWorldBrief(sampleIntent, { scene_id: 'B01' })
check('由示例意图生成的 World Brief 通过 Schema', validate(wb), JSON.stringify(validate.errors || []))
check('校验器无错误对象残留', !validate.errors || validate.errors.length === 0)

// 缺字段
const badMissing = JSON.parse(JSON.stringify(wb))
delete badMissing.generation
check('缺少 generation 时被 Schema 拒绝', validate(badMissing) === false)

// 类型错误
const badType = JSON.parse(JSON.stringify(wb))
badType.motion_plan.duration_seconds = '十二'
check('duration_seconds 类型错误时被 Schema 拒绝', validate(badType) === false)

const badEnum = JSON.parse(JSON.stringify(wb))
badType.motion_plan.duration_seconds = 12
badType.intent.scene.confidence = 'super'
check('confidence 非法枚举时被 Schema 拒绝', validate(badType) === false)

/* ───────────────────────── 3. 适配器规则 ───────────────────────── */
console.log('\n[3] 适配器规则')
check('inferred_values 一律 unconfirmed / model_inference（从未自动确认）',
  wb.intent.inferred_values.every((x) => x.status === 'unconfirmed' && x.source === 'model_inference'))
check('desired_values 标记为 confirmed / user',
  wb.intent.desired_values.every((x) => x.status === 'confirmed' && x.source === 'user'))
check('avoid 标记为 confirmed / user',
  wb.intent.avoid.every((x) => x.status === 'confirmed' && x.source === 'user'))

// 用户纠正：移除冲突推断
const intentWithCorrection = {
  scene: { description: '森林', location: '森林', environment: ['树木'], confidence: 'medium' },
  activities: ['散步'],
  daily_rhythm: null,
  social_context: null,
  desired_values: [],
  inferred_values: ['自由与自主', '创造与表达'],
  confirmed_values: [],
  visual_elements: ['森林'],
  avoid: [],
  uncertainties: [],
  missing_information: [],
  ready_for_clarify: false,
}
const wbCorr = adaptIntentToWorldBrief(intentWithCorrection, { corrections: ['自由与自主'] })
check('被纠正的推断从 inferred_values 中移除',
  !wbCorr.intent.inferred_values.some((x) => x.value === '自由与自主'))
check('被纠正项进入 user_corrections（rejected/user）',
  wbCorr.intent.user_corrections.some((x) => x.value === '自由与自主' && x.status === 'rejected' && x.source === 'user'))
check('未纠正的推断保留',
  wbCorr.intent.inferred_values.some((x) => x.value === '创造与表达'))

// 组装提示词：被纠正项不得作为事实出现
const imgPrompt = assembleImagePrompt(wbCorr)
check('组装提示词包含固定禁止项（文字/Logo/UI）', imgPrompt.includes('文字/Logo/UI'))
check('组装提示词引用集中调色板（深海蓝 #04222E）', imgPrompt.includes('#04222E'))
check('被纠正项「自由与自主」不作为事实出现在提示词', !imgPrompt.includes('自由与自主'))

/* ───────────────────────── 4. 前端无密钥泄漏 ───────────────────────── */
console.log('\n[4] 前端/构建无密钥泄漏')
function walk(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(f)) continue
      walk(p, acc)
    } else {
      acc.push(p)
    }
  }
  return acc
}
const srcFiles = walk(join(ROOT, 'src'))
let leak = false
const leakRe = /sk-[A-Za-z0-9]{12,}|or-v1-[A-Za-z0-9]{12,}|AIza[0-9A-Za-z_-]{20,}/ // 真实密钥形态
for (const p of srcFiles) {
  const txt = readFileSync(p, 'utf8')
  if (leakRe.test(txt)) { leak = true; console.error('    命中密钥形态：', p) }
}
check('src/ 下不存在真实 API 密钥字符串', !leak)
const noViteSecret = !srcFiles.some((p) => {
  const t = readFileSync(p, 'utf8')
  return t.includes('VITE_DEEPSEEK') || t.includes('VITE_OPENROUTER') || t.includes('VITE_DOUBAO')
})
check('前端无 VITE_ 前缀的密钥暴露', noViteSecret)

/* ───────────────────────── 5. Phase 1/2 路由不受影响 ───────────────────────── */
console.log('\n[5] Phase 1/2 未受影响')
const serverSrc = readFileSync(join(ROOT, 'server/index.mjs'), 'utf8')
check('后端保留 /api/imagine/conversation 路由（Phase 2）', serverSrc.includes("'/api/imagine/conversation'"))
check('后端新增 /api/world-brief/assemble 路由（Phase 3）', serverSrc.includes("'/api/world-brief/assemble'"))
check('App.vue 仍在 Observe/Imagine 间切换（Phase 1/2 结构）',
  readFileSync(join(ROOT, 'src/App.vue'), 'utf8').includes("type Phase = 'observe' | 'imagine'"))
check('基准测试台独立于展览入口（benchmark.html 存在）',
  readFileSync(join(ROOT, 'benchmark.html'), 'utf8').includes('benchmark-app'))

/* ───────────────────────── 汇总 ───────────────────────── */
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
