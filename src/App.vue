<script setup lang="ts">
import { ref } from 'vue'
import ObserveStage from './components/observe/ObserveStage.vue'
import ImagineStage from './components/imagine/ImagineStage.vue'
import CreateStage from './components/create/CreateStage.vue'
import type { ImagineIntent } from './types/imagine'

/**
 * 应用根组件：在 Observe / Imagine / Create 三个阶段之间切换。
 * Imagine 使用 v-show 保留在 DOM 中，以便在进入 Create 再返回时
 * 保留第二阶段已确认的意图与对话状态。
 */
type Phase = 'observe' | 'imagine' | 'create'

const phase = ref<Phase>('observe')
const createIntent = ref<ImagineIntent | null>(null)

function enterImagine() {
  phase.value = 'imagine'
}

function backToObserve() {
  phase.value = 'observe'
}

function goCreate(intent: ImagineIntent | null) {
  // 诊断（仅开发环境；不记录密钥或完整对话内容）
  if (import.meta.env.DEV) {
    console.info('[diag]', {
      event: 'stage2_continue_clicked',
      hasIntent: !!intent,
      hasScene: !!(intent?.scene?.location || intent?.scene?.description),
    })
  }
  // 缺少必要意图时，不允许进入第三阶段，避免静默失败。
  if (!intent) {
    if (import.meta.env.DEV) {
      console.warn('[diag]', { event: 'stage3_navigation_failed', reason: 'missing_intent' })
    }
    return
  }
  if (import.meta.env.DEV) console.info('[diag]', { event: 'stage3_navigation_started' })
  createIntent.value = intent
  phase.value = 'create'
  if (import.meta.env.DEV) console.info('[diag]', { event: 'stage3_navigation_succeeded' })
}

// “看看 AI 如何理解我的想象”（原 Clarify 网关）与“进入你的世界”都进入第三阶段 Create。
function onClarify(intent: ImagineIntent) {
  goCreate(intent)
}

function onCreate(intent: ImagineIntent) {
  goCreate(intent)
}

function backToImagine() {
  phase.value = 'imagine'
}
</script>

<template>
  <ObserveStage v-if="phase === 'observe'" @imagine-start="enterImagine" />
  <ImagineStage
    v-show="phase === 'imagine'"
    @back="backToObserve"
    @clarify="onClarify"
    @create="onCreate"
  />
  <CreateStage v-if="phase === 'create'" :intent="createIntent!" @back-to-imagine="backToImagine" />
</template>
