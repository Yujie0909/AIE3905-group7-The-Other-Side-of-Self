// 第三阶段 World Brief 适配器（纯函数，无外部依赖）
// 职责：将第二阶段 ImagineIntent → 符合 schemas/world-brief.schema.json 的 World Brief；
//       并依据提示词模板组装生图/动态提示词。
// 不在此文件调用任何图像/视频生成 API（仅组装文本）。

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

const VB_VERSION = 'v1'
const SCHEMA_VERSION = '1.0.0'
const PROMPT_VERSION = 'img-master-v1'

function marked(value, status, source) {
  return { value: value || '', status, source }
}

function arr(items) {
  return Array.isArray(items) ? items.filter((x) => typeof x === 'string' && x) : []
}

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

/**
 * 将第二阶段 ImagineIntent 转换为 World Brief。
 * @param {object} intent 第二阶段 ImagineIntent
 * @param {object} [options]
 * @param {string[]} [options.corrections] 用户纠正/否决的条目（字符串），会进入 user_corrections 并从推断中移除
 * @param {string} [options.world_id]
 * @param {string} [options.scene_id]
 */
export function adaptIntentToWorldBrief(intent, options = {}) {
  const i = intent || {}
  const corrections = arr(options.corrections)
  const correctionNorm = corrections.map(norm)

  // 用户纠正：从推断中剔除冲突项，并记入 user_corrections（rejected/user）
  const inferredValues = []
  const userCorrections = corrections.map((c) => marked(c, 'rejected', 'user'))
  for (const v of arr(i.inferred_values)) {
    const isCorrected = correctionNorm.some((cn) => norm(v).includes(cn) || cn.includes(norm(v)))
    if (isCorrected) {
      // 已被用户纠正：从推断列表中移除（该否决已通过 corrections 记入 user_corrections）
      continue
    }
    inferredValues.push(marked(v, 'unconfirmed', 'model_inference'))
  }

  // 已确认价值 = desired_values + confirmed_values（均为用户侧确认）
  const desired = [
    ...arr(i.desired_values).map((v) => marked(v, 'confirmed', 'user')),
    ...arr(i.confirmed_values).map((v) => marked(v, 'confirmed', 'user')),
  ]

  const sc = i.scene && typeof i.scene === 'object' ? i.scene : {}
  const envItems = arr(sc.environment).map((v) => marked(v, 'confirmed', 'user'))
  const sceneConfidence = ['high', 'medium', 'low', 'none'].includes(sc.confidence) ? sc.confidence : 'none'

  const scene = {
    description: marked(sc.description || '', sc.description ? 'confirmed' : 'unknown', 'user'),
    location: marked(sc.location || '', sc.location ? 'confirmed' : 'unknown', 'user'),
    environment: envItems,
    confidence: sceneConfidence,
  }

  const activities = arr(i.activities).map((v) => marked(v, 'confirmed', 'user'))
  const dailyRhythm = sc && i.daily_rhythm ? [marked(i.daily_rhythm, 'confirmed', 'user')] : []
  const socialContext = i.social_context ? [marked(i.social_context, 'confirmed', 'user')] : []
  const avoid = arr(i.avoid).map((v) => marked(v, 'confirmed', 'user'))

  // ── visual_plan：艺术方向决策层（系统基于 VB 生成，非用户心理推断）──
  const locationText = scene.location.value || scene.description.value || '未指定地点'
  const activityText = activities.length ? activities.map((a) => a.value).join('、') : '静坐或缓行'
  const subjectValue = `一个身处${locationText}的孤身身影，正在${activityText}；仅以背影、侧影或局部（手/肩/发）呈现，不露脸`
  const moodBase = ['沉浸', '克制', '诗意', '缓慢变化']
  const mood = [...new Set([...moodBase, ...desired.map((d) => d.value)])].slice(0, 6)

  const visualPlan = {
    subject: marked(subjectValue, 'confirmed', 'model_inference'),
    composition: ['三分法或中心留白', '主体偏小、环境偏大', '近景柔焦—中景氛围—远景海平线/林线/天光三层纵深'],
    palette: {
      base: '#04222E',
      accent: '#8EDBE4',
      notes: '低饱和低对比；暖白 #F4EFE6 用于人物/织物；青绿 #0E5A57 作中景过渡',
    },
    lighting: ['柔和侧逆光', '漫射天光', '无硬阴影、非舞台聚光'],
    materials: ['棉麻', '未抛光木', '石', '水面', '雾', '织物'],
    mood,
    reference_asset_ids: arr(options.reference_asset_ids),
  }

  // ── motion_plan：动态潜力描述（不调用视频 API）──
  const motionPlan = {
    environment_motion: ['远处水面/雾气极缓流动', '光影缓移', '轻微空气感'],
    camera_motion: '固定长镜或极缓慢推拉，避免快速摇移/变焦/手持抖动',
    duration_seconds: 12,
    loop: true,
  }

  const generation = {
    image_model: null,
    video_model: null,
    prompt_version: PROMPT_VERSION,
    image_job_id: null,
    video_job_id: null,
    quality_score: null,
    revision: 0,
  }

  const worldId = options.world_id || `world-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    schema_version: SCHEMA_VERSION,
    world_id: worldId,
    meta: {
      created_at: new Date().toISOString(),
      source_phase: 'imagine',
      visual_bible_version: VB_VERSION,
      language: 'zh',
      note: options.scene_id ? `benchmark scene ${options.scene_id}` : 'from imagine intent',
    },
    intent: {
      scene,
      activities,
      daily_rhythm: dailyRhythm,
      social_context: socialContext,
      desired_values: desired,
      inferred_values: inferredValues,
      user_corrections: userCorrections,
      avoid,
    },
    visual_plan: visualPlan,
    motion_plan: motionPlan,
    generation,
  }
}

function readTemplate(name) {
  try {
    return readFileSync(join(ROOT, 'visual-bible', 'prompt-templates', name), 'utf8')
  } catch {
    return ''
  }
}

function paletteSummary() {
  return '深海蓝基底 #04222E，青绿过渡 #0E5A57，柔和青蓝焦点 #8EDBE4，暖白 #F4EFE6（低饱和低对比，禁高饱和撞色）'
}

function fixedProhibitions() {
  return '文字/Logo/UI 叠加；商业海报构图；过度饱和/霓虹/赛博朋克高对比；无意义光效；露脸特写；纯黑主色'
}

/**
 * 组装主形象图提示词（image-master 模板）。
 * 规则：confirmed/user 意图作为事实；unconfirmed/model_inference 推断仅以弱语气"暗示"出现；
 *       被用户纠正（user_corrections）的条目不进入事实陈述。
 */
export function assembleImagePrompt(worldBrief, templateText) {
  const tpl = templateText || readTemplate('image-master.md')
  const it = worldBrief.intent
  const vp = worldBrief.visual_plan

  const sceneLoc = it.scene.location.value
  const sceneEnv = it.scene.environment.map((e) => e.value).join('、')
  const sceneText = [sceneLoc, sceneEnv].filter(Boolean).join('，') || it.scene.description.value || '未指定场景'

  const activityText = it.activities.map((a) => a.value).join('；') || '（无特定活动）'
  const socialText = it.social_context.map((s) => s.value).join('；') || '（未指定）'
  const timeText = it.daily_rhythm.map((d) => d.value).join('；') || '（时刻未指定，默认清晨/黄昏柔光）'
  const avoidText = [...it.avoid.map((a) => a.value), fixedProhibitions()].filter(Boolean).join('；')

  let out = tpl
  const repl = {
    '{{SUBJECT}}': vp.subject.value,
    '{{SCENE_LOCATION}}': sceneText,
    '{{ACTIVITIES}}': activityText,
    '{{TIME_OF_DAY}}': timeText,
    '{{SOCIAL_CONTEXT}}': socialText,
    '{{PALETTE}}': paletteSummary(),
    '{{LIGHTING}}': vp.lighting.join('；'),
    '{{COMPOSITION}}': vp.composition.join('；'),
    '{{MOOD}}': vp.mood.join('、'),
    '{{MATERIALS}}': vp.materials.join('、'),
    '{{AVOID}}': avoidText,
    '{{CAMERA}}': worldBrief.motion_plan.camera_motion,
  }
  for (const [k, v] of Object.entries(repl)) {
    out = out.replace(new RegExp(k, 'g'), v)
  }

  // 弱语气暗示区：仅列未确认的模型推断，且排除被纠正项
  const soft = it.inferred_values
    .filter((x) => x.status === 'unconfirmed' && x.source === 'model_inference')
    .map((x) => x.value)
  if (soft.length) {
    out += `\n\n[暗示性元素·非事实·弱呈现] 画面可隐约呼应：${soft.join('、')}（仅作氛围暗示，不作为确定事实）。`
  }
  return out
}

/** 组装动态提示词（video-motion 模板），同样不调用视频 API。 */
export function assembleVideoPrompt(worldBrief, templateText) {
  const tpl = templateText || readTemplate('video-motion.md')
  const mp = worldBrief.motion_plan
  const repl = {
    '{{ENVIRONMENT_MOTION}}': mp.environment_motion.join('；'),
    '{{CAMERA_MOTION}}': mp.camera_motion,
    '{{PEOPLE_MOTION}}': '人物若有，仅极缓动作（背影/局部）',
    '{{DURATION}}': String(mp.duration_seconds),
    '{{LOOP}}': mp.loop ? '无缝' : '非循环',
    '{{SCENE_STILL}}': `world_id=${worldBrief.world_id}（主形象图占位）`,
  }
  let out = tpl
  for (const [k, v] of Object.entries(repl)) {
    out = out.replace(new RegExp(k, 'g'), v)
  }
  return out
}

export const VISUAL_BIBLE_VERSION = VB_VERSION
export const PROMPT_VERSION_TAG = PROMPT_VERSION

/**
 * 将用户确认的"方向微调"并入提示词（不改确认过的核心意图）。
 * revisions 字段仅为可选的可理解偏好，且冲突时需前端再次确认。
 * 仅在原提示词基础上追加弱语气修饰，绝不覆盖已确认的语义内容。
 */
export function applyRevisions(prompt, revisions) {
  if (!revisions || typeof revisions !== 'object') return prompt
  const add = []
  if (revisions.lighting === 'softer') add.push('光线更柔和、更漫射，阴影更淡')
  else if (revisions.lighting === 'more_contrast') add.push('保留低对比纪律，但微微提升空气透视')
  if (revisions.atmosphere === 'calmer') add.push('氛围更静谧、更克制，减少额外元素')
  else if (revisions.atmosphere === 'warmer') add.push('在暖白微偏移上略增温度')
  if (revisions.openness === 'more') add.push('进一步增加留白，环境更开阔，主体更小')
  else if (revisions.openness === 'less') add.push('略微收拢画面空间，但仍保持呼吸感')
  if (!add.length) return prompt
  return `${prompt}\n\n[方向微调·不覆盖已确认意图] ${add.join('；')}。`
}

/** 参考图引导：按角色说明其对生成结果的作用，强化"参考不覆盖场景"的约束。 */
export function referenceGuidance(refs) {
  if (!Array.isArray(refs) || !refs.length) return ''
  const parts = []
  const scene = refs.filter((r) => r.role === 'scene')
  const style = refs.filter((r) => r.role === 'style')
  const lighting = refs.filter((r) => r.role === 'lighting')
  const composition = refs.filter((r) => r.role === 'composition')
  if (scene.length) parts.push(`场景参考（仅借鉴空间与主体气质，不替换观众已确认的理想场景）：${scene.map((r) => r.title).join('、')}`)
  if (style.length) parts.push(`风格参考（遵循 Visual Bible 低饱和基调）：${style.map((r) => r.title).join('、')}`)
  if (lighting.length) parts.push(`光线参考：${lighting.map((r) => r.title).join('、')}`)
  if (composition.length) parts.push(`构图参考：${composition.map((r) => r.title).join('、')}`)
  return `[参考图引导] ${parts.join('；')}。`
}

/**
 * 组装第三阶段生图提示词（可复现、不泄漏密钥）。
 * 组合：World Brief + 既定 image-master 模板 + 参考图引导 + 方向微调 + 模型约束。
 */
export function buildStage3Prompt(worldBrief, options = {}) {
  const base = assembleImagePrompt(worldBrief, options.templateText)
  let prompt = base
  const refText = referenceGuidance(options.references)
  if (refText) prompt += `\n\n${refText}`
  prompt = applyRevisions(prompt, options.revisions)
  // 复现记录：保留 prompt_version、模型与参数说明，但绝不写入密钥。
  const record = {
    prompt_version: PROMPT_VERSION,
    visual_bible_version: VB_VERSION,
    language: worldBrief?.meta?.language || 'zh',
    references: (options.references || []).map((r) => ({ asset_id: r.asset_id, role: r.role, title: r.title })),
    revisions: options.revisions || null,
    size: options.size || null,
    note: '由 buildStage3Prompt 组装；含 World Brief + Visual Bible + 参考图引导 + 方向微调；不含任何密钥。',
  }
  return { prompt, record }
}
