<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import type { ImagineIntent } from '../../types/imagine'
import type {
  GenerationJob,
  GenerationReferenceCandidate,
  GenerationRevision,
} from '../../types/create'
import AmbientBackground from '../observe/AmbientBackground.vue'
import ImagineParticles from '../imagine/ImagineParticles.vue'
import { postWorldBrief } from '../../api/worldBrief'
import {
  postGeneration,
  getGeneration,
  listGenerations,
  selectGeneration,
  getReferenceCandidates,
} from '../../api/create'

const props = defineProps<{ intent: ImagineIntent }>()
const emit = defineEmits<{ backToImagine: [] }>()

type GenStatus = 'idle' | 'preparing' | 'generating' | 'succeeded' | 'failed'

const step = ref<'transition' | 'review' | 'result'>('transition')
const genStatus = ref<GenStatus>('idle')
const genError = ref<string | null>(null)

const worldBrief = ref<any>(null)
const wbValidation = ref<any>(null)
const candidates = ref<GenerationReferenceCandidate[]>([])
const selectedRefs = ref<Set<string>>(new Set())
const job = ref<GenerationJob | null>(null)
const history = ref<GenerationJob[]>([])

const worldId = ref<string>('')
const revisions = reactive<GenerationRevision>({})
const showRevision = ref(false)

// ── 本地持久化 world_id，刷新后恢复历史（满足"刷新后仍可用"）──
function loadWorldId(): string | null {
  try {
    return localStorage.getItem('create_world_id') || null
  } catch {
    return null
  }
}
function saveWorldId(id: string) {
  try {
    localStorage.setItem('create_world_id', id)
  } catch {
    /* ignore */
  }
}

function joinItems(arr?: { value: string }[]): string {
  if (!arr || !arr.length) return ''
  return arr.map((x) => x.value).filter(Boolean).join('、')
}

// ── 世界摘要（从已确认 World Brief 派生，不展示原始 JSON）──
const summary = computed(() => {
  const wb = worldBrief.value
  if (!wb) return null
  const it = wb.intent
  const sceneMissing = it?.scene?.confidence === 'none' || (!it?.scene?.location?.value && !it?.scene?.description?.value)
  return {
    sceneLocation: it?.scene?.location?.value || it?.scene?.description?.value || '',
    sceneEnv: (it?.scene?.environment || []).map((e: any) => e.value).join('、'),
    dailyRhythm: joinItems(it?.daily_rhythm),
    activities: joinItems(it?.activities),
    social: joinItems(it?.social_context) || '独处',
    values: joinItems(it?.desired_values) || joinItems(it?.inferred_values),
    avoid: joinItems(it?.avoid),
    corrections: joinItems(it?.user_corrections),
    sceneMissing,
  }
})

const visualDirection = computed(() => {
  const wb = worldBrief.value
  if (!wb) return null
  const vp = wb.visual_plan
  return {
    base: vp?.palette?.base || '#04222E',
    accent: vp?.palette?.accent || '#0E5A57',
    notes: vp?.palette?.notes || '',
    lighting: vp?.lighting || [],
    mood: vp?.mood || [],
    materials: vp?.materials || [],
    composition: vp?.composition || [],
    subject: vp?.subject?.value || '',
  }
})

// ── 参考图预览：按角色分组，默认各选 1（scene/style）──
const sceneCandidates = computed(() => candidates.value.filter((c) => c.reference_roles.includes('scene') && c.file_status === 'present'))
const styleCandidates = computed(() => candidates.value.filter((c) => c.reference_roles.includes('style') && c.file_status === 'present'))

function refRole(id: string): string {
  if (sceneCandidates.value.some((c) => c.asset_id === id)) return 'scene'
  if (styleCandidates.value.some((c) => c.asset_id === id)) return 'style'
  return 'composition'
}

function toggleRef(id: string) {
  if (selectedRefs.value.has(id)) selectedRefs.value.delete(id)
  else {
    if (selectedRefs.value.size >= 4) return // 保守上限，避免超过模型参考数
    selectedRefs.value.add(id)
  }
  selectedRefs.value = new Set(selectedRefs.value)
}

function placeholderStyle(id: string): Record<string, string> {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const a = h % 360
  return { background: `linear-gradient(135deg, hsl(${a},28%,22%), hsl(${(a + 40) % 360},30%,30%))` }
}

const resultImageUrl = computed(() => {
  const uri = job.value?.result_image_uri
  if (!uri) return ''
  // 后端持久化路径为 assets/generated/xxx，经 /generated/<file> 提供
  const m = uri.match(/assets\/generated\/(.+)$/)
  return m ? `/generated/${m[1]}` : uri
})

// ── 生命周期 ──
onMounted(async () => {
  // 短暂过渡
  setTimeout(() => {
    if (step.value === 'transition') step.value = 'review'
  }, 2000)

  const existing = loadWorldId()
  if (existing) {
    worldId.value = existing
    try {
      history.value = await listGenerations(existing)
      const last = [...history.value].reverse().find((j) => j.status === 'succeeded')
      if (last) {
        job.value = last
        genStatus.value = 'succeeded'
        step.value = 'result'
        if (import.meta.env.DEV) console.info('[diag]', { event: 'world_brief_ready', source: 'cached_history' })
        return
      }
    } catch {
      /* ignore */
    }
  }

  // 诊断：意图校验开始（仅记录是否存在场景，不记录对话原文）
  if (import.meta.env.DEV) {
    console.info('[diag]', {
      event: 'intent_validation_started',
      hasScene: !!(props.intent?.scene?.location || props.intent?.scene?.description),
    })
  }
  try {
    const wb = await postWorldBrief({ intent: props.intent })
    worldBrief.value = wb.world_brief
    wbValidation.value = wb.validation
    if (import.meta.env.DEV) {
      console.info('[diag]', { event: 'world_brief_ready', valid: wb.validation?.valid })
      console.info('[diag]', {
        event: wb.validation?.valid ? 'intent_validation_succeeded' : 'intent_validation_failed',
        reason: wb.validation?.valid ? null : 'world_brief_schema_invalid',
      })
    }
    candidates.value = await getReferenceCandidates()
    // 默认选择：1 个场景 + 1 个风格（若可用）
    if (sceneCandidates.value[0]) selectedRefs.value.add(sceneCandidates.value[0].asset_id)
    if (styleCandidates.value[0]) selectedRefs.value.add(styleCandidates.value[0].asset_id)
    selectedRefs.value = new Set(selectedRefs.value)
  } catch {
    worldBrief.value = null
    if (import.meta.env.DEV) {
      console.warn('[diag]', { event: 'intent_validation_failed', reason: 'world_brief_request_failed' })
    }
  }
})

let pollTimer: number | null = null
function stopPolling() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollJob(id: string) {
  stopPolling()
  pollTimer = window.setInterval(async () => {
    try {
      const j = await getGeneration(id)
      if (j.status === 'succeeded' || j.status === 'failed') {
        stopPolling()
        job.value = j
        genStatus.value = j.status
        if (j.status === 'succeeded') step.value = 'result'
        else genError.value = j.error_message || '生成失败，请重试。'
      }
    } catch {
      /* 轮询失败不中断，等待下次 */
    }
  }, 1200)
}

async function createWorld(rev?: GenerationRevision) {
  if (genStatus.value === 'preparing' || genStatus.value === 'generating') return // 防重复提交
  genError.value = null
  genStatus.value = 'preparing'
  step.value = 'review' // 维持底层内容，显示生成覆盖层
  try {
    const ids = [...selectedRefs.value]
    const roleMap: Record<string, string> = {}
    for (const id of ids) roleMap[id] = refRole(id)
    const j = await postGeneration({
      intent: props.intent,
      world_id: worldId.value || undefined,
      reference_asset_ids: ids,
      role_map: roleMap,
      revisions: rev || null,
    })
    worldId.value = j.world_id || worldId.value
    if (worldId.value) saveWorldId(worldId.value)
    job.value = j
    genStatus.value = 'generating'
    showRevision.value = false
    pollJob(j.job_id)
    history.value = await listGenerations(worldId.value).catch(() => history.value)
  } catch (e) {
    genStatus.value = 'failed'
    genError.value = e instanceof Error ? e.message : '生成失败，请重试。'
  }
}

function keepWorld() {
  if (job.value) selectGeneration(job.value.job_id).catch(() => {})
}
function regenerate() {
  createWorld(Object.keys(revisions).length ? { ...revisions } : undefined)
}
function openRevision() {
  showRevision.value = true
}
async function confirmRevision() {
  await createWorld({ ...revisions })
}
function goBack() {
  stopPolling()
  emit('backToImagine')
}
function viewHistory(j: GenerationJob) {
  job.value = j
  genStatus.value = j.status === 'succeeded' ? 'succeeded' : 'idle'
  step.value = j.status === 'succeeded' ? 'result' : 'review'
}

onUnmounted(stopPolling)
</script>

<template>
  <main class="create">
    <AmbientBackground />
    <ImagineParticles :count="56" />

    <header class="create__bar">
      <span class="create__label">03 / CREATE</span>
      <button type="button" class="create__back" @click="goBack">返回镜面 · 修改意图</button>
    </header>

    <!-- 过渡 -->
    <section v-if="step === 'transition'" class="create__transition">
      <h1 class="create__title">Your inner world is taking shape.</h1>
      <p class="create__subtitle">你的理想生活，正在成为可见的世界。</p>
    </section>

    <!-- 摘要 + 方向 + 生成 -->
    <section v-else-if="step === 'review'" class="create__review">
      <div class="create__scroll">
        <p v-if="!worldBrief" class="create__missing">
          我们还无法拼出你的世界蓝图（World Brief 校验未通过或信息不足）。
          <button type="button" class="create__text-btn" @click="goBack">回到镜面，继续补充</button>
        </p>

        <template v-else>
          <!-- 世界摘要 -->
          <div class="create__panel">
            <p class="create__panel-title">你向往的世界</p>
            <dl class="create__summary">
              <div class="create__srow">
                <dt>场景与环境</dt>
                <dd>
                  <template v-if="summary?.sceneMissing">尚不清晰——可回到镜面补充</template>
                  <template v-else>{{ summary?.sceneLocation }}<span v-if="summary?.sceneEnv" class="create__tag">{{ summary?.sceneEnv }}</span></template>
                  <span v-if="summary?.dailyRhythm" class="create__tag">{{ summary?.dailyRhythm }}</span>
                </dd>
              </div>
              <div v-if="summary?.activities" class="create__srow">
                <dt>你希望从事</dt>
                <dd>{{ summary?.activities }}</dd>
              </div>
              <div class="create__srow">
                <dt>陪伴方式</dt>
                <dd>{{ summary?.social }}</dd>
              </div>
              <div v-if="summary?.values" class="create__srow">
                <dt>你珍视的</dt>
                <dd>{{ summary?.values }}</dd>
              </div>
              <div v-if="summary?.avoid" class="create__srow">
                <dt>你想避开</dt>
                <dd>{{ summary?.avoid }}</dd>
              </div>
              <div v-if="summary?.corrections" class="create__srow">
                <dt>你纠正过</dt>
                <dd class="create__correction">{{ summary?.corrections }}</dd>
              </div>
            </dl>
          </div>

          <!-- 视觉方向 -->
          <div class="create__panel">
            <p class="create__panel-title">视觉方向</p>
            <div class="create__dir">
              <div class="create__swatches">
                <span class="create__swatch" :style="{ background: visualDirection?.base }"></span>
                <span class="create__swatch" :style="{ background: visualDirection?.accent }"></span>
                <span class="create__swatch" style="background: #f4efe6"></span>
              </div>
              <p class="create__dir-note">{{ visualDirection?.notes }}</p>
              <div class="create__chips">
                <span v-for="l in visualDirection?.lighting" :key="l" class="create__chip">{{ l }}</span>
              </div>
              <div class="create__chips">
                <span v-for="m in visualDirection?.mood" :key="m" class="create__chip">{{ m }}</span>
              </div>
              <div class="create__chips">
                <span v-for="m in visualDirection?.materials" :key="m" class="create__chip create__chip--mat">{{ m }}</span>
              </div>
              <p v-if="visualDirection?.subject" class="create__subject">{{ visualDirection?.subject }}</p>
            </div>
          </div>

          <!-- 参考图选择 -->
          <div class="create__panel">
            <p class="create__panel-title">参考素材（已筛选可生产）</p>
            <p v-if="!candidates.length" class="create__hint">暂无已批准的参考素材；将仅依据文字与 Visual Bible 生成。</p>
            <div v-else class="create__refs">
              <button
                v-for="c in candidates"
                :key="c.asset_id"
                type="button"
                class="create__ref"
                :class="{ 'create__ref--on': selectedRefs.has(c.asset_id) }"
                :disabled="!selectedRefs.has(c.asset_id) && selectedRefs.size >= 4"
                @click="toggleRef(c.asset_id)"
              >
                <span class="create__ref-thumb" :style="placeholderStyle(c.asset_id)"></span>
                <span class="create__ref-title">{{ c.title }}</span>
                <span class="create__ref-role">{{ refRole(c.asset_id) }}</span>
              </button>
            </div>
            <p class="create__hint">点击选择/取消；最多 4 张。场景与风格各选 1 张即可，其余可选。</p>
          </div>
        </template>
      </div>

      <div class="create__foot">
        <button
          v-if="worldBrief"
          type="button"
          class="create__primary"
          :disabled="genStatus === 'preparing' || genStatus === 'generating'"
          @click="createWorld()"
        >
          生成我的理想世界
        </button>
        <p v-if="genError" class="create__err">{{ genError }}</p>
      </div>
    </section>

    <!-- 结果 -->
    <section v-else-if="step === 'result'" class="create__result">
      <div class="create__result-inner">
        <img v-if="resultImageUrl" :src="resultImageUrl" alt="生成的理想世界" class="create__img" />
        <div v-else class="create__img create__img--ph"></div>

        <div class="create__result-actions">
          <button type="button" class="create__primary" @click="keepWorld">保留这个世界</button>
          <button type="button" class="create__ghost" @click="regenerate">重新生成</button>
          <button type="button" class="create__ghost" @click="openRevision">修改创作方向</button>
          <button type="button" class="create__text-btn" @click="goBack">修改意图</button>
        </div>

        <div v-if="showRevision" class="create__revision">
          <p class="create__panel-title">微调方向（不改变你已确认的核心场景）</p>
          <div class="create__rev-row">
            <span>光线</span>
            <button type="button" :class="{ on: revisions.lighting === 'softer' }" @click="revisions.lighting = revisions.lighting === 'softer' ? undefined : 'softer'">更柔和</button>
            <button type="button" :class="{ on: revisions.lighting === 'more_contrast' }" @click="revisions.lighting = revisions.lighting === 'more_contrast' ? undefined : 'more_contrast'">略增层次</button>
          </div>
          <div class="create__rev-row">
            <span>氛围</span>
            <button type="button" :class="{ on: revisions.atmosphere === 'calmer' }" @click="revisions.atmosphere = revisions.atmosphere === 'calmer' ? undefined : 'calmer'">更静谧</button>
            <button type="button" :class="{ on: revisions.atmosphere === 'warmer' }" @click="revisions.atmosphere = revisions.atmosphere === 'warmer' ? undefined : 'warmer'">更温暖</button>
          </div>
          <div class="create__rev-row">
            <span>空间</span>
            <button type="button" :class="{ on: revisions.openness === 'more' }" @click="revisions.openness = revisions.openness === 'more' ? undefined : 'more'">更开阔</button>
            <button type="button" :class="{ on: revisions.openness === 'less' }" @click="revisions.openness = revisions.openness === 'less' ? undefined : 'less'">更聚拢</button>
          </div>
          <div class="create__revision-actions">
            <button type="button" class="create__primary" @click="confirmRevision">以此方向重新生成</button>
            <button type="button" class="create__text-btn" @click="showRevision = false">取消</button>
          </div>
        </div>

        <div v-if="history.length > 1" class="create__history">
          <p class="create__panel-title">先前的世界</p>
          <div class="create__history-row">
            <button
              v-for="h in history"
              :key="h.job_id"
              type="button"
              class="create__hist"
              :class="{ on: job && h.job_id === job.job_id }"
              :disabled="h.status !== 'succeeded'"
              @click="viewHistory(h)"
            >
              <span class="create__hist-thumb" :style="placeholderStyle(h.job_id)"></span>
              <span class="create__hist-status">{{ h.status }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 生成覆盖层 -->
    <transition name="create-fade">
      <div v-if="genStatus === 'preparing' || genStatus === 'generating'" class="create__generating">
        <div class="create__gen-inner">
          <h2 class="create__gen-title">你的理想世界正在成形</h2>
          <p class="create__gen-sub">我们正把你的想象与视觉语言编织成画面……</p>
          <div class="create__gen-rings"><span></span><span></span><span></span></div>
        </div>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.create {
  position: relative;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  color: var(--c-text);
}
.create__bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(1rem, 3vh, 2rem) clamp(1.2rem, 4vw, 3rem);
}
.create__label {
  font-size: var(--fs-stage-label);
  letter-spacing: var(--tracking-label);
  text-indent: var(--tracking-label);
  color: var(--c-cyan-dim);
}
.create__back {
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  color: rgba(184, 200, 208, 0.6);
  padding: 0.5em 1em;
  border-radius: var(--radius-soft);
  transition: color 400ms var(--ease-soft);
}
.create__back:hover { color: var(--c-text); }

.create__transition {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: var(--space-3);
  animation: create-fade-in 1800ms var(--ease-soft) both;
}
.create__title {
  margin: 0; font-family: var(--font-serif);
  font-size: clamp(1.8rem, 1.3rem + 2.4vw, 3rem); font-weight: 500;
  letter-spacing: 0.12em; color: var(--c-text);
  text-shadow: 0 0 40px rgba(142, 219, 228, 0.25);
}
.create__subtitle {
  margin-top: var(--space-2);
  font-size: var(--fs-subtitle); letter-spacing: var(--tracking-subtitle);
  text-transform: uppercase; color: var(--c-text-secondary);
}

.create__review, .create__result {
  position: absolute; inset: 0;
  z-index: 4;
  display: flex; flex-direction: column; align-items: center;
  padding: clamp(4rem, 12vh, 6rem) clamp(1rem, 4vw, 3rem) clamp(1.5rem, 6vh, 3rem);
}
.create__scroll {
  width: 100%; max-width: min(92vw, 760px);
  /* 关键：占满剩余空间并在内部滚动，确保底部按钮始终可见，不会被挤出屏幕 */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: var(--space-3);
  padding-bottom: var(--space-4);
}
.create__panel {
  background: var(--c-glass);
  border: 1px solid var(--c-hairline);
  border-radius: var(--radius-soft);
  backdrop-filter: blur(10px);
  padding: var(--space-3);
}
.create__panel-title {
  margin: 0 0 var(--space-2);
  font-size: 0.8rem; letter-spacing: 0.18em;
  color: var(--c-cyan-dim);
}
.create__summary { margin: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.create__srow { padding: var(--space-1) 0; border-top: 1px solid var(--c-hairline); }
.create__srow dt {
  font-size: 0.76rem; letter-spacing: 0.14em; color: var(--c-cyan-dim); margin-bottom: 0.4em;
}
.create__srow dd { margin: 0; font-size: 1.02rem; line-height: 1.7; color: var(--c-text); }
.create__tag {
  display: inline-block; margin: 0 0.3em; padding: 0.1em 0.7em;
  border-radius: var(--radius-pill); font-size: 0.82rem; color: var(--c-cyan);
  background: rgba(142, 219, 228, 0.1); border: 1px solid var(--c-hairline);
}
.create__correction { color: rgba(213, 198, 160, 0.9); }

.create__dir { display: flex; flex-direction: column; gap: var(--space-1); }
.create__swatches { display: flex; gap: 0.6rem; }
.create__swatch { width: 42px; height: 42px; border-radius: 10px; border: 1px solid var(--c-hairline); }
.create__dir-note { margin: 0; font-size: 0.88rem; color: var(--c-text-secondary); line-height: 1.6; }
.create__chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.create__chip {
  padding: 0.25em 0.85em; border-radius: var(--radius-pill);
  font-size: 0.84rem; color: var(--c-text-secondary);
  background: rgba(142, 219, 228, 0.08); border: 1px solid var(--c-hairline);
}
.create__chip--mat { color: rgba(213, 198, 160, 0.85); }
.create__subject { margin: 0.4em 0 0; font-size: 0.92rem; color: var(--c-text-secondary); font-style: italic; }

.create__refs { display: flex; flex-wrap: wrap; gap: 0.7rem; }
.create__ref {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  width: 92px; padding: 0.5rem; border-radius: var(--radius-soft);
  background: rgba(9, 26, 42, 0.5); border: 1px solid var(--c-hairline);
  color: var(--c-text-secondary); cursor: pointer; transition: all 400ms var(--ease-soft);
}
.create__ref--on { border-color: rgba(142, 219, 228, 0.6); box-shadow: 0 0 18px rgba(142, 219, 228, 0.2); color: var(--c-text); }
.create__ref:disabled { opacity: 0.4; cursor: not-allowed; }
.create__ref-thumb { width: 70px; height: 50px; border-radius: 8px; }
.create__ref-title { font-size: 0.72rem; line-height: 1.3; text-align: center; }
.create__ref-role { font-size: 0.62rem; letter-spacing: 0.1em; color: var(--c-cyan-dim); }
.create__hint { margin: 0.6em 0 0; font-size: 0.8rem; color: rgba(184, 200, 208, 0.55); }

.create__foot {
  width: 100%; max-width: min(92vw, 760px);
  flex: 0 0 auto;
  display: flex; flex-direction: column; align-items: center; gap: 0.8rem;
  margin-top: var(--space-2);
}
.create__primary {
  min-width: min(72vw, 280px); min-height: 54px; padding: 0.85em 2.4em;
  border-radius: var(--radius-pill); font-size: var(--fs-button); letter-spacing: 0.14em;
  font-weight: 600; color: #06222c;
  background: linear-gradient(180deg, #b8ecf2, var(--c-cyan));
  border: 1px solid rgba(226, 248, 250, 0.6);
  box-shadow: 0 0 24px rgba(142, 219, 228, 0.25);
  transition: box-shadow 500ms var(--ease-soft), transform 300ms var(--ease-soft);
}
.create__primary:active { transform: scale(0.97); }
.create__primary:disabled { opacity: 0.5; cursor: not-allowed; }
.create__ghost {
  min-width: min(64vw, 220px); min-height: 48px; padding: 0.7em 2.2em;
  border-radius: var(--radius-pill); font-size: 0.98rem; color: var(--c-text-secondary);
  background: var(--c-glass); border: 1px solid var(--c-hairline); backdrop-filter: blur(8px);
}
.create__ghost:hover { color: var(--c-text); border-color: rgba(142, 219, 228, 0.45); }
.create__text-btn { min-height: 44px; padding: 0 1em; color: rgba(184, 200, 208, 0.75); font-size: 0.9rem; }
.create__text-btn:hover { color: var(--c-text); }
.create__err { margin: 0; font-size: 0.95rem; color: rgba(213, 198, 160, 0.9); text-align: center; }

.create__result { justify-content: flex-start; overflow-y: auto; }
.create__result-inner {
  width: 100%; max-width: min(94vw, 860px);
  display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
}
.create__img {
  width: min(84vw, 680px); max-height: 64vh; object-fit: contain; border-radius: var(--radius-soft);
  border: 1px solid var(--c-hairline); box-shadow: 0 0 60px rgba(142, 219, 228, 0.12);
}
.create__img--ph { height: 50vh; background: linear-gradient(135deg, #0E5A57, #04222E); }
.create__result-actions, .create__revision-actions {
  display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center;
}
.create__revision {
  width: 100%; max-width: 560px; background: var(--c-glass); border: 1px solid var(--c-hairline);
  border-radius: var(--radius-soft); padding: var(--space-3);
}
.create__rev-row { display: flex; align-items: center; gap: 0.8rem; margin: 0.6rem 0; }
.create__rev-row > span:first-child { width: 3em; font-size: 0.8rem; color: var(--c-cyan-dim); letter-spacing: 0.1em; }
.create__rev-row button {
  padding: 0.4em 1em; border-radius: var(--radius-pill); font-size: 0.88rem;
  color: var(--c-text-secondary); background: rgba(9, 26, 42, 0.5); border: 1px solid var(--c-hairline);
}
.create__rev-row button.on { color: #06222c; background: var(--c-cyan); border-color: rgba(226, 248, 250, 0.6); }

.create__history { width: 100%; max-width: 680px; }
.create__history-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.create__hist {
  display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.4rem; border-radius: 10px; background: rgba(9, 26, 42, 0.5);
  border: 1px solid var(--c-hairline); cursor: pointer;
}
.create__hist:disabled { opacity: 0.35; cursor: not-allowed; }
.create__hist.on { border-color: rgba(142, 219, 228, 0.6); }
.create__hist-thumb { width: 64px; height: 44px; border-radius: 6px; }
.create__hist-status { font-size: 0.6rem; color: var(--c-cyan-dim); }

.create__generating {
  position: absolute; inset: 0; z-index: 7;
  display: flex; align-items: center; justify-content: center;
  background: rgba(4, 18, 31, 0.72); backdrop-filter: blur(6px);
}
.create__gen-inner { text-align: center; }
.create__gen-title {
  margin: 0; font-family: var(--font-serif); font-size: clamp(1.4rem, 1.1rem + 1.4vw, 2.2rem);
  font-weight: 500; color: var(--c-text); text-shadow: 0 0 30px rgba(142, 219, 228, 0.25);
}
.create__gen-sub { margin: var(--space-2) 0 var(--space-4); color: var(--c-text-secondary); font-size: var(--fs-body); }
.create__gen-rings { position: relative; height: 120px; }
.create__gen-rings span {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  border-radius: 50%; border: 1px solid rgba(142, 219, 228, 0.4);
  animation: gen-breathe 3.4s var(--ease-soft) infinite;
}
.create__gen-rings span:nth-child(1) { width: 40px; height: 40px; }
.create__gen-rings span:nth-child(2) { width: 78px; height: 78px; animation-delay: 0.6s; }
.create__gen-rings span:nth-child(3) { width: 118px; height: 118px; animation-delay: 1.2s; }
@keyframes gen-breathe {
  0% { opacity: 0.25; transform: translate(-50%, -50%) scale(0.85); }
  50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.05); }
  100% { opacity: 0.25; transform: translate(-50%, -50%) scale(0.85); }
}
.create-fade-enter-active, .create-fade-leave-active { transition: opacity 700ms var(--ease-soft); }
.create-fade-enter-from, .create-fade-leave-to { opacity: 0; }
@keyframes create-fade-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.create__missing { color: var(--c-text-secondary); line-height: 1.8; text-align: center; }
</style>
