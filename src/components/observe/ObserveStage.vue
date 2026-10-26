<script setup lang="ts">
import { computed } from 'vue'
import AmbientBackground from './AmbientBackground.vue'
import StageTypography from './StageTypography.vue'
import InteractionControls from './InteractionControls.vue'
import { useExperienceState } from '../../composables/useExperienceState'

/**
 * Observe 阶段主界面。文案与按钮配置随状态集中派生，避免散落的布尔变量与旧文案残留。
 */
const { state, continueReady, stay, beginExplore, continueToImagine, backToMirror, beginImagine } =
  useExperienceState()

const emit = defineEmits<{ imagineStart: [] }>()

/* ── 严格规定的文案（不可私自替换）───────────────── */
const WELCOME_LINES = [
  '欢迎来到《自我的彼岸》。',
  '在这里，你不需要成为任何人，也不需要证明什么。',
  '先停留一会儿，看看镜子里的自己。',
  '你可以什么都不说，也可以只是感受此刻的自己。',
  '当你准备好时，我们再一起出发。',
]

const HINT = '不必急着回答，准备好时再继续。'

const PAUSE_RESPONSE = '没关系。这里没有需要赶上的进度。你可以按照自己的节奏来。'

const TRANSITION_LINE =
  '好。接下来，我们不讨论你应该成为什么样的人，只看看你真正向往什么。'

const IMAGINE_LINES = [
  '有时候，我们会想象另一种生活，或者另一个自己。',
  '接下来，你可以说说你向往的生活。',
  '不需要组织得很完整，也没有标准答案。',
]

interface StageCopy {
  stageLabel: string
  title?: string
  subtitle?: string
  lines: string[]
  hint?: string
  primary: string
  secondary?: string
  primaryVisible?: boolean
}

const copy = computed<StageCopy>(() => {
  switch (state.value) {
    case 'welcome':
      return {
        stageLabel: '01 / OBSERVE',
        title: '自我的彼岸',
        subtitle: 'The Other Side of Self',
        lines: WELCOME_LINES,
        hint: HINT,
        primary: '开始探索',
        secondary: '再停留一会儿',
      }
    case 'pause':
      return {
        stageLabel: '01 / OBSERVE',
        title: '自我的彼岸',
        subtitle: 'The Other Side of Self',
        // 在原有欢迎文案基础上，温和地追加安抚回应（不替换、不重复）
        lines: [...WELCOME_LINES, PAUSE_RESPONSE],
        primary: '开始探索',
        secondary: '再停留一会儿',
      }
    case 'startTransition':
      return {
        stageLabel: '01 / OBSERVE',
        lines: [TRANSITION_LINE],
        // AI 回应显示完成后才揭示「继续」入口
        primary: '继续',
        primaryVisible: continueReady.value,
      }
    case 'imagine_intro':
      return {
        stageLabel: '02 / IMAGINE',
        lines: IMAGINE_LINES,
        primary: '开始表达',
        secondary: '返回镜面',
      }
  }
})

const mirror = computed(
  () => state.value === 'startTransition' || state.value === 'imagine_intro',
)

function onPrimary() {
  switch (state.value) {
    case 'welcome':
    case 'pause':
      beginExplore()
      break
    case 'startTransition':
      continueToImagine()
      break
    case 'imagine_intro':
      emit('imagineStart')
      beginImagine()
      break
  }
}

function onSecondary() {
  if (state.value === 'welcome') stay()
  else if (state.value === 'pause') stay() // PAUSE→PAUSE：保持，不追加
  else if (state.value === 'imagine_intro') backToMirror()
}
</script>

<template>
  <main class="observe">
    <!-- 动态深海背景 / 镜面占位：始终挂载，状态切换时不重置 -->
    <AmbientBackground :mirror="mirror" />

    <!-- 镜面状态标识：原型未接入实时摄像头，明确声明降级方案 -->
    <div class="observe__mirror-tag" aria-hidden="true">
      <span class="observe__mirror-dot"></span>
      镜面 · 原型占位（未接入实时摄像头）
    </div>

    <section class="observe__content" aria-live="polite">
      <Transition name="stage" mode="out-in">
        <div :key="state" class="observe__stage">
          <StageTypography
            :stage-label="copy.stageLabel"
            :title="copy.title"
            :subtitle="copy.subtitle"
            :lines="copy.lines"
          />

          <p v-if="copy.hint" class="observe__hint">{{ copy.hint }}</p>

          <InteractionControls
            class="observe__controls"
            :primary="copy.primary"
            :secondary="copy.secondary"
            :primary-visible="copy.primaryVisible"
            @primary="onPrimary"
            @secondary="onSecondary"
          />
        </div>
      </Transition>
    </section>
  </main>
</template>

<style scoped>
.observe {
  position: relative;
  height: 100dvh;
  width: 100%;
}

.observe__mirror-tag {
  position: absolute;
  left: clamp(1rem, 3vw, 2.5rem);
  bottom: clamp(1rem, 3vh, 2rem);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  color: rgba(184, 200, 208, 0.45);
  pointer-events: none;
}

.observe__mirror-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(142, 219, 228, 0.5);
  box-shadow: 0 0 8px rgba(142, 219, 228, 0.5);
}

.observe__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vh, 3rem);
}

.observe__stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-height: 100%;
  overflow: hidden auto;
  scrollbar-width: none;
}

.observe__stage::-webkit-scrollbar {
  display: none;
}

.observe__hint {
  margin: 0;
  font-size: clamp(0.85rem, 0.78rem + 0.2vw, 0.98rem);
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: rgba(184, 200, 208, 0.7);
  animation: hint-breath 4.5s var(--ease-soft) infinite alternate;
}

@keyframes hint-breath {
  from {
    opacity: 0.45;
  }
  to {
    opacity: 0.85;
  }
}

/* 状态整体切换：柔和交叉淡入淡出 */
.stage-enter-active {
  transition: opacity var(--dur-line) var(--ease-soft);
}

.stage-leave-active {
  transition: opacity 700ms var(--ease-soft);
}

.stage-enter-from,
.stage-leave-to {
  opacity: 0;
}
</style>
