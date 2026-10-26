<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import scenesData from '../../visual-bible/benchmark-scenes.json'
import { postWorldBrief, type WorldBriefResponse } from '../api/worldBrief'
import { postConversation } from '../api/imagine'
import type { ImagineIntent } from '../types/imagine'

interface Scene {
  scene_id: string
  category: string
  title: string
  user_input: string
  must_include: string[]
  must_avoid: string[]
  evaluation_focus: string[]
  reference_asset_ids: string[]
  visual_bible_version: string
}

const scenes = (scenesData as { scenes: Scene[] }).scenes
const selectedId = ref<string>(scenes[0]?.scene_id ?? '')
const selected = computed<Scene>(() => scenes.find((s) => s.scene_id === selectedId.value) ?? scenes[0])

const intentText = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<WorldBriefResponse | null>(null)

interface RunRecord {
  run_id: string
  scene_id: string
  model: string
  prompt_version: string
  visual_bible_version: string
  status: string
  error_count: number
  created_at: string
}
const records = ref<RunRecord[]>([])

function uid() {
  return crypto.randomUUID()
}

/** 离线示例意图：从场景元信息生成一个最小可跑的 ImagineIntent（供管道测试，可编辑） */
function buildStubIntent(scene: Scene): ImagineIntent {
  return {
    scene: {
      description: scene.title,
      location: scene.category,
      environment: [],
      confidence: 'medium',
    },
    activities: [],
    daily_rhythm: null,
    social_context: null,
    desired_values: [],
    inferred_values: [],
    confirmed_values: [],
    visual_elements: [scene.category],
    avoid: [],
    uncertainties: [],
    missing_information: [],
    ready_for_clarify: false,
  }
}

function loadStub() {
  intentText.value = JSON.stringify(buildStubIntent(selected.value), null, 2)
  error.value = null
  result.value = null
}

watch(selectedId, loadStub, { immediate: true })

async function generateFromDialogue() {
  error.value = null
  result.value = null
  loading.value = true
  try {
    const res = await postConversation({
      session_id: uid(),
      request_id: uid(),
      message: selected.value.user_input,
      input_mode: 'text',
      history: [],
      intent: null,
      confirmed_values: [],
      inferred_values: [],
    })
    intentText.value = JSON.stringify(res.intent, null, 2)
  } catch (e) {
    error.value =
      e instanceof Error
        ? `用对话生成意图失败（需配置 DEEPSEEK_API_KEY）：${e.message}。可改用「载入示例意图」手动编辑。`
        : '对话生成意图失败'
  } finally {
    loading.value = false
  }
}

async function assemble() {
  let intent: ImagineIntent
  try {
    intent = JSON.parse(intentText.value) as ImagineIntent
  } catch {
    error.value = '意图 JSON 解析失败，请检查格式。'
    return
  }
  if (!intent || typeof intent !== 'object' || !intent.scene) {
    error.value = '意图缺少 scene 字段，无法组装。'
    return
  }
  error.value = null
  result.value = null
  loading.value = true
  try {
    const res = await postWorldBrief({ intent, scene_id: selected.value.scene_id })
    result.value = res
    records.value.unshift({
      run_id: uid(),
      scene_id: selected.value.scene_id,
      model: res.doubao.image_model || 'doubao-seedream（占位/未接入）',
      prompt_version: res.prompt_version,
      visual_bible_version: res.visual_bible_version,
      status: res.validation.valid ? 'pass' : 'fail',
      error_count: res.validation.errors.length,
      created_at: new Date().toISOString(),
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '组装失败'
  } finally {
    loading.value = false
  }
}

function exportRecords() {
  const blob = new Blob([JSON.stringify(records.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `benchmark-records-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="bm">
    <header class="bm__head">
      <div>
        <h1>Visual Bible 基准测试台</h1>
        <p class="bm__sub">《自我的彼岸》第三阶段 · 开发期专用 · 非展览入口</p>
      </div>
      <span class="bm__badge">DEV ONLY · 不接入展览路由</span>
    </header>

    <div class="bm__grid">
      <!-- 左：场景选择 + 输入 -->
      <section class="bm__col">
        <label class="bm__label" for="scene">选择基准场景（B01–B24）</label>
        <select id="scene" v-model="selectedId" class="bm__select">
          <option v-for="s in scenes" :key="s.scene_id" :value="s.scene_id">
            {{ s.scene_id }} · {{ s.category }} · {{ s.title }}
          </option>
        </select>

        <div class="bm__card" v-if="selected">
          <h2>{{ selected.scene_id }} · {{ selected.title }}</h2>
          <p><b>类别：</b>{{ selected.category }}</p>
          <p><b>用户输入：</b>{{ selected.user_input }}</p>
          <p><b>必须包含：</b></p>
          <ul><li v-for="m in selected.must_include" :key="m">{{ m }}</li></ul>
          <p><b>必须避免：</b></p>
          <ul><li v-for="m in selected.must_avoid" :key="m">{{ m }}</li></ul>
          <p><b>评分重点：</b>{{ selected.evaluation_focus.join('、') }}</p>
          <p><b>Visual Bible 版本：</b>{{ selected.visual_bible_version }}</p>
        </div>

        <div class="bm__card bm__demo">
          ⚠ 演示标注：本测试台仅验证「意图 → World Brief → 提示词」管线；
          <b>不调用任何图像/视频生成 API</b>（豆包接口已预留但未接入）。
        </div>
      </section>

      <!-- 右：意图编辑 + 组装 + 结果 -->
      <section class="bm__col">
        <div class="bm__actions">
          <button type="button" class="bm__btn" @click="loadStub">载入示例意图（离线）</button>
          <button type="button" class="bm__btn" :disabled="loading" @click="generateFromDialogue">
            用对话生成意图（需 DeepSeek）
          </button>
        </div>

        <label class="bm__label">意图 JSON（ImagineIntent，可编辑）</label>
        <textarea v-model="intentText" class="bm__area" spellcheck="false"></textarea>

        <button type="button" class="bm__btn bm__btn--primary" :disabled="loading" @click="assemble">
          {{ loading ? '组装中…' : '组装 World Brief' }}
        </button>

        <p v-if="error" class="bm__error">{{ error }}</p>

        <div v-if="result" class="bm__result">
          <div class="bm__status" :class="result.validation.valid ? 'is-ok' : 'is-bad'">
            校验：{{ result.validation.valid ? 'VALID' : 'INVALID' }}
            <span v-if="!result.validation.valid">（{{ result.validation.errors.length }} 项错误）</span>
          </div>
          <p class="bm__meta">
            VB v{{ result.visual_bible_version }} · prompt v{{ result.prompt_version }} ·
            豆包状态：{{ result.doubao.demo_status }}
          </p>

          <h3>组装后主形象图提示词</h3>
          <pre class="bm__pre">{{ result.assembled_prompts.image }}</pre>

          <h3>组装后动态提示词（不调用视频 API）</h3>
          <pre class="bm__pre">{{ result.assembled_prompts.video }}</pre>

          <details>
            <summary>World Brief JSON</summary>
            <pre class="bm__pre">{{ JSON.stringify(result.world_brief, null, 2) }}</pre>
          </details>

          <details>
            <summary>校验错误明细</summary>
            <pre class="bm__pre">{{ JSON.stringify(result.validation.errors, null, 2) }}</pre>
          </details>
        </div>
      </section>
    </div>

    <!-- 记录 -->
    <section class="bm__records">
      <div class="bm__records-head">
        <h2>运行记录（保存全部，不只为最佳）</h2>
        <div>
          <button type="button" class="bm__btn bm__btn--sm" @click="exportRecords" :disabled="!records.length">
            导出记录 JSON
          </button>
        </div>
      </div>
      <table class="bm__table" v-if="records.length">
        <thead>
          <tr><th>run_id</th><th>scene</th><th>model</th><th>prompt_v</th><th>VB_v</th><th>status</th><th>errors</th><th>时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.run_id">
            <td>{{ r.run_id.slice(0, 8) }}</td>
            <td>{{ r.scene_id }}</td>
            <td>{{ r.model }}</td>
            <td>{{ r.prompt_version }}</td>
            <td>{{ r.visual_bible_version }}</td>
            <td :class="r.status === 'pass' ? 'is-ok' : 'is-bad'">{{ r.status }}</td>
            <td>{{ r.error_count }}</td>
            <td>{{ new Date(r.created_at).toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="bm__hint">尚无记录。组装一次后会出现在这里。</p>
    </section>
  </div>
</template>

<style scoped>
.bm {
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 4vw, 3rem) 3rem;
  color: #e8eef0;
  font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.bm__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(142, 219, 228, 0.2);
  padding-bottom: 1rem;
}
.bm__head h1 {
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: 0.04em;
}
.bm__sub {
  margin: 0.3rem 0 0;
  font-size: 0.85rem;
  color: rgba(184, 200, 208, 0.7);
}
.bm__badge {
  flex: none;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: #04222e;
  background: #8edbe4;
  padding: 0.35em 0.7em;
  border-radius: 999px;
}
.bm__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  margin-top: 1.4rem;
}
@media (max-width: 880px) {
  .bm__grid {
    grid-template-columns: 1fr;
  }
}
.bm__col {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.bm__label {
  font-size: 0.82rem;
  color: rgba(184, 200, 208, 0.85);
  letter-spacing: 0.06em;
}
.bm__select,
.bm__area {
  width: 100%;
  background: rgba(4, 34, 46, 0.6);
  color: #e8eef0;
  border: 1px solid rgba(142, 219, 228, 0.3);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  font-size: 0.9rem;
}
.bm__area {
  min-height: 260px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  resize: vertical;
}
.bm__card {
  background: rgba(14, 90, 87, 0.12);
  border: 1px solid rgba(142, 219, 228, 0.18);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  font-size: 0.9rem;
  line-height: 1.6;
}
.bm__card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
}
.bm__card ul {
  margin: 0.2rem 0 0.6rem;
  padding-left: 1.1rem;
}
.bm__demo {
  background: rgba(213, 198, 160, 0.1);
  border-color: rgba(213, 198, 160, 0.35);
  color: rgba(244, 239, 230, 0.92);
}
.bm__actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.bm__btn {
  background: rgba(142, 219, 228, 0.12);
  color: #e8eef0;
  border: 1px solid rgba(142, 219, 228, 0.4);
  border-radius: 999px;
  padding: 0.55em 1.1em;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 300ms ease;
}
.bm__btn:hover:not(:disabled) {
  background: rgba(142, 219, 228, 0.22);
}
.bm__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.bm__btn--primary {
  background: linear-gradient(180deg, #b8ecf2, #8edbe4);
  color: #04222e;
  font-weight: 600;
  border-color: rgba(226, 248, 250, 0.6);
}
.bm__btn--sm {
  padding: 0.4em 0.9em;
  font-size: 0.8rem;
}
.bm__error {
  color: rgba(213, 160, 160, 0.95);
  font-size: 0.88rem;
}
.bm__result {
  margin-top: 0.4rem;
}
.bm__status {
  display: inline-block;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  padding: 0.3em 0.7em;
  border-radius: 999px;
}
.bm__status.is-ok {
  background: rgba(120, 200, 160, 0.2);
  color: #aef0c8;
}
.bm__status.is-bad {
  background: rgba(213, 160, 160, 0.2);
  color: #f0b4b4;
}
.bm__meta {
  font-size: 0.82rem;
  color: rgba(184, 200, 208, 0.75);
  margin: 0.4rem 0 0.8rem;
}
.bm__result h3 {
  font-size: 0.95rem;
  margin: 0.9rem 0 0.4rem;
}
.bm__pre {
  background: rgba(4, 34, 46, 0.7);
  border: 1px solid rgba(142, 219, 228, 0.2);
  border-radius: 10px;
  padding: 0.8rem;
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 360px;
  overflow: auto;
}
.bm__records {
  margin-top: 2rem;
  border-top: 1px solid rgba(142, 219, 228, 0.2);
  padding-top: 1rem;
}
.bm__records-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bm__records-head h2 {
  font-size: 1.05rem;
}
.bm__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  margin-top: 0.6rem;
}
.bm__table th,
.bm__table td {
  text-align: left;
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(142, 219, 228, 0.12);
}
.bm__table th {
  color: rgba(184, 200, 208, 0.7);
  font-weight: 500;
}
.bm__hint {
  font-size: 0.85rem;
  color: rgba(184, 200, 208, 0.6);
}
.is-ok {
  color: #aef0c8;
}
.is-bad {
  color: #f0b4b4;
}
</style>
