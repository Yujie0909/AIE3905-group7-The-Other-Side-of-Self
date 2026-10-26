<script setup lang="ts">
import type { ImagineIntent } from '../../types/imagine'

defineProps<{ intent: ImagineIntent }>()
const emit = defineEmits<{ toClarify: []; continueEdit: []; toCreate: [] }>()

function join(arr?: string[]): string {
  return arr && arr.length ? arr.join('、') : '—'
}
</script>

<template>
  <div class="summary">
    <h2 class="summary__title">我们好像看见了一个你向往的世界。</h2>
    <p class="summary__sub">我们可以先从已经出现的画面开始。</p>

    <dl class="summary__list">
      <div class="summary__item">
        <dt>你描述的场景</dt>
        <dd>
          {{ intent.scene.description || intent.scene.location || '尚未明确' }}
          <span v-if="intent.scene.environment.length" class="summary__tag">{{ join(intent.scene.environment) }}</span>
          <span v-if="intent.daily_rhythm" class="summary__tag">{{ intent.daily_rhythm }}</span>
        </dd>
      </div>

      <div class="summary__item">
        <dt>你希望从事的活动</dt>
        <dd>{{ join(intent.activities) }}</dd>
      </div>

      <div v-if="intent.confirmed_values.length" class="summary__item">
        <dt>你明确表达的价值</dt>
        <dd>{{ join(intent.confirmed_values) }}</dd>
      </div>

      <div v-if="intent.desired_values.length" class="summary__item">
        <dt>你提到的价值</dt>
        <dd>{{ join(intent.desired_values) }}</dd>
      </div>

      <div v-if="intent.inferred_values.length" class="summary__item">
        <dt>可能的理解<span class="summary__hint">（尚待你确认）</span></dt>
        <dd>{{ join(intent.inferred_values) }}</dd>
      </div>

      <div v-if="intent.avoid.length" class="summary__item">
        <dt>你希望避开</dt>
        <dd>{{ join(intent.avoid) }}</dd>
      </div>

      <div v-if="intent.uncertainties.length" class="summary__item">
        <dt>仍想确认的</dt>
        <dd>{{ join(intent.uncertainties) }}</dd>
      </div>
    </dl>

    <div class="summary__actions">
      <button type="button" class="summary__btn summary__btn--primary" @click="emit('toCreate')">
        进入你的世界
      </button>
      <button type="button" class="summary__btn summary__btn--ghost" @click="emit('toClarify')">
        看看 AI 如何理解我的想象
      </button>
      <button type="button" class="summary__btn summary__btn--ghost" @click="emit('continueEdit')">
        继续补充
      </button>
    </div>
  </div>
</template>

<style scoped>
.summary {
  width: min(88vw, 620px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}
.summary__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.4rem, 1.1rem + 1.4vw, 2.2rem);
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--c-text);
  text-shadow: 0 0 30px rgba(142, 219, 228, 0.2);
}
.summary__sub {
  margin: 0 0 var(--space-2);
  color: var(--c-text-secondary);
  font-size: var(--fs-body);
}
.summary__list {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: left;
}
.summary__item {
  padding: var(--space-1) 0;
  border-top: 1px solid var(--c-hairline);
}
.summary__item dt {
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  color: var(--c-cyan-dim);
  margin-bottom: 0.4em;
}
.summary__item dd {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.7;
  color: var(--c-text);
}
.summary__hint {
  font-size: 0.72rem;
  color: rgba(213, 198, 160, 0.8);
  letter-spacing: 0.04em;
}
.summary__tag {
  display: inline-block;
  margin: 0 0.3em;
  padding: 0.1em 0.7em;
  border-radius: var(--radius-pill);
  font-size: 0.82rem;
  color: var(--c-cyan);
  background: rgba(142, 219, 228, 0.1);
  border: 1px solid var(--c-hairline);
}
.summary__actions {
  margin-top: var(--space-2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}
.summary__btn {
  min-width: min(72vw, 260px);
  min-height: 52px;
  padding: 0.85em 2.4em;
  border-radius: var(--radius-pill);
  font-size: var(--fs-button);
  letter-spacing: 0.14em;
  text-indent: 0.14em;
  transition: box-shadow 500ms var(--ease-soft), transform 300ms var(--ease-soft), border-color 500ms var(--ease-soft);
}
.summary__btn:active {
  transform: scale(0.97);
}
.summary__btn--primary {
  color: #06222c;
  font-weight: 600;
  background: linear-gradient(180deg, #b8ecf2, var(--c-cyan));
  border: 1px solid rgba(226, 248, 250, 0.6);
  box-shadow: 0 0 24px rgba(142, 219, 228, 0.25);
}
.summary__btn--ghost {
  color: var(--c-text-secondary);
  background: var(--c-glass);
  border: 1px solid var(--c-hairline);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.summary__btn--ghost:hover {
  color: var(--c-text);
  border-color: rgba(142, 219, 228, 0.45);
}
</style>
