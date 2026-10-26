<script setup lang="ts">
import { computed } from 'vue'
import AmbientBackground from '../observe/AmbientBackground.vue'
import StageTypography from '../observe/StageTypography.vue'
import ImagineParticles from './ImagineParticles.vue'
import ImagineMirror from './ImagineMirror.vue'
import ImagineInputBar from './ImagineInputBar.vue'
import ImagineSummary from './ImagineSummary.vue'
import ImagineDebug from './ImagineDebug.vue'
import { useImagineState } from '../../composables/useImagineState'
import type { ImagineIntent } from '../../types/imagine'

/**
 * Imagine 阶段沉浸式主界面：镜面圆环 + 粒子 + 聆听/理解/回应光影，
 * 无左右对话气泡；AI 回应作为独立文字层，用户表达作为轻量痕迹。
 */
const emit = defineEmits<{ back: []; clarify: [intent: ImagineIntent]; create: [intent: ImagineIntent] }>()

const {
  screen,
  visualState,
  intent,
  messages,
  currentResponse,
  readyForClarify,
  error,
  waitingHint,
  thinking,
  startExpressing,
  notSure,
  submit,
  retry,
  resumeText,
  seeSummary,
  continueEdit,
  setListening,
} = useImagineState()

// 用户的表达痕迹（弱化显示，不作为对话气泡）
const traces = computed(() => messages.value.filter((m) => m.role === 'user').slice(-4))

// 开发环境标志（模板中不能使用 import.meta，统一在此读取）
const isDev = import.meta.env.DEV

function onClarify() {
  if (intent.value) emit('clarify', intent.value)
}

function onToCreate() {
  if (intent.value) emit('create', intent.value)
}
</script>

<template>
  <main class="imagine">
    <AmbientBackground :mirror="true" />

    <ImagineParticles :count="72" />

    <ImagineMirror :state="visualState" />

    <header class="imagine__bar">
      <span class="imagine__label">02 / IMAGINE</span>
      <button type="button" class="imagine__back" @click="emit('back')">返回镜面</button>
    </header>

    <section class="imagine__content" aria-live="polite">
      <!-- ENTER -->
      <div v-if="screen === 'enter'" class="imagine__enter">
        <StageTypography
          stage-label="02 / IMAGINE"
          title="你理想中的自己是什么样子？"
          subtitle="不必马上回答。可以从一个画面、一件小事，或一种感受开始。"
          :lines="[]"
        />
        <div class="imagine__enter-actions">
          <button type="button" class="imagine__primary" @click="startExpressing">开始表达</button>
          <button type="button" class="imagine__ghost" @click="notSure">我还没想好</button>
        </div>
      </div>

      <!-- DIALOG（镜面空间） -->
      <div v-else-if="screen === 'dialog'" class="imagine__space">
        <div class="imagine__response" :class="{ 'is-hidden': !currentResponse }">
          <p class="imagine__response-text">{{ currentResponse }}</p>
        </div>

        <div class="imagine__traces" aria-hidden="true">
          <p v-for="m in traces" :key="m.id" class="imagine__trace">{{ m.text }}</p>
        </div>

        <div class="imagine__bottom">
          <p v-if="waitingHint" class="imagine__wait">我还在聆听你的话语…</p>

          <ImagineInputBar
            :busy="thinking"
            :placeholder="intent?.missing_information?.length ? '还可以补充：' + intent.missing_information[0] : '你最先想到的是什么？可以慢慢说…'"
            @submit="submit"
            @listening="setListening"
          />

          <div class="imagine__foot">
            <button
              v-if="!thinking"
              type="button"
              class="imagine__skip"
              @click="seeSummary"
            >
              跳过，先看看已收集的内容
            </button>
            <template v-if="readyForClarify && !thinking">
              <span class="imagine__divider">·</span>
              <button type="button" class="imagine__skip" @click="onClarify">
                看看 AI 如何理解我的想象
              </button>
            </template>
          </div>

          <div v-if="error" class="imagine__error">
            <p class="imagine__error-msg">{{ error }}</p>
            <div class="imagine__error-actions">
              <button type="button" class="imagine__ghost" @click="retry">重试</button>
              <button type="button" class="imagine__text-btn" @click="resumeText">继续文字交流</button>
            </div>
          </div>
        </div>
      </div>

      <!-- SUMMARY -->
      <div v-else-if="screen === 'summary' && intent" class="imagine__summary-wrap">
        <ImagineSummary :intent="intent" @to-clarify="onClarify" @continue-edit="continueEdit" @to-create="onToCreate" />
      </div>
    </section>

    <ImagineDebug v-if="intent && isDev" :intent="intent" :visual-state="visualState" />
  </main>
</template>

<style scoped>
.imagine {
  position: relative;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}

.imagine__bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(1rem, 3vh, 2rem) clamp(1.2rem, 4vw, 3rem);
}

.imagine__label {
  font-size: var(--fs-stage-label);
  letter-spacing: var(--tracking-label);
  text-indent: var(--tracking-label);
  color: var(--c-cyan-dim);
}

.imagine__back {
  font-size: 0.82rem;
  letter-spacing: 0.16em;
  color: rgba(184, 200, 208, 0.6);
  padding: 0.5em 1em;
  border-radius: var(--radius-soft);
  transition: color 400ms var(--ease-soft);
}

.imagine__back:hover {
  color: var(--c-text);
}

.imagine__content {
  position: relative;
  z-index: 4;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(4.5rem, 12vh, 7rem) clamp(1rem, 4vw, 3rem) clamp(1.5rem, 5vh, 3rem);
}

.imagine__enter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.imagine__enter-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

/* 镜面空间：回应文字层位于中央偏下，用户痕迹在其下轻量呈现 */
.imagine__space {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: clamp(1.5rem, 6vh, 4rem);
}

.imagine__response {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(90vw, 640px);
  text-align: center;
  transition: opacity 700ms var(--ease-soft);
}

.imagine__response.is-hidden {
  opacity: 0;
}

.imagine__response-text {
  margin: 0;
  font-size: clamp(1.1rem, 0.95rem + 0.9vw, 1.5rem);
  line-height: 1.95;
  color: var(--c-text);
  text-shadow: 0 1px 18px rgba(2, 8, 14, 0.7);
  white-space: pre-line;
  animation: reveal 700ms var(--ease-soft) both;
}

@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.imagine__traces {
  width: min(90vw, 560px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  margin-bottom: 1.2rem;
}

.imagine__trace {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgba(184, 200, 208, 0.4);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.imagine__bottom {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
}

.imagine__wait {
  margin: 0;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  color: rgba(142, 219, 228, 0.7);
  animation: hint-breath 2.6s var(--ease-soft) infinite alternate;
}

@keyframes hint-breath {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 0.9;
  }
}

.imagine__foot {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 26px;
  flex-wrap: wrap;
  justify-content: center;
}

.imagine__divider {
  color: rgba(184, 200, 208, 0.4);
}

.imagine__skip {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  color: rgba(184, 200, 208, 0.55);
  padding: 0.4em 0.8em;
  transition: color 400ms var(--ease-soft);
}

.imagine__skip:hover {
  color: var(--c-text-secondary);
}

.imagine__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  text-align: center;
}

.imagine__error-msg {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(213, 198, 160, 0.9);
}

.imagine__error-actions {
  display: flex;
  gap: var(--space-2);
}

.imagine__summary-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  max-height: 100%;
}

/* 通用按钮（延续第一阶段视觉） */
.imagine__primary {
  min-width: min(72vw, 260px);
  min-height: 52px;
  padding: 0.85em 2.4em;
  border-radius: var(--radius-pill);
  font-size: var(--fs-button);
  letter-spacing: 0.14em;
  text-indent: 0.14em;
  font-weight: 600;
  color: #06222c;
  background: linear-gradient(180deg, #b8ecf2, var(--c-cyan));
  border: 1px solid rgba(226, 248, 250, 0.6);
  box-shadow: 0 0 24px rgba(142, 219, 228, 0.25);
  transition: box-shadow 500ms var(--ease-soft), transform 300ms var(--ease-soft);
}

.imagine__primary:active {
  transform: scale(0.97);
}

.imagine__ghost {
  min-width: min(72vw, 260px);
  min-height: 48px;
  padding: 0.7em 2.4em;
  border-radius: var(--radius-pill);
  font-size: 0.98rem;
  letter-spacing: 0.1em;
  color: var(--c-text-secondary);
  background: var(--c-glass);
  border: 1px solid var(--c-hairline);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: color 400ms var(--ease-soft), border-color 400ms var(--ease-soft);
}

.imagine__ghost:hover {
  color: var(--c-text);
  border-color: rgba(142, 219, 228, 0.45);
}

.imagine__text-btn {
  min-height: 46px;
  padding: 0 1em;
  color: rgba(184, 200, 208, 0.75);
  font-size: 0.9rem;
}

.imagine__text-btn:hover {
  color: var(--c-text);
}
</style>
