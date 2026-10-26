<script setup lang="ts">
/**
 * 交互控制区：主按钮 / 次按钮。
 * 主按钮始终存在；次按钮可选。primaryVisible 用于过渡阶段延迟揭示「继续」。
 * 不再包含独立退出主按钮，避免与两个核心入口争夺注意力。
 */
defineProps<{
  primary: string
  secondary?: string
  primaryVisible?: boolean
}>()

const emit = defineEmits<{
  primary: []
  secondary: []
}>()

function onPrimaryClick() {
  emit('primary')
}
</script>

<template>
  <div class="controls">
    <button
      v-if="primaryVisible !== false"
      type="button"
      class="controls__btn controls__btn--primary"
      @click="onPrimaryClick"
    >
      {{ primary }}
    </button>

    <button
      v-if="secondary"
      type="button"
      class="controls__btn controls__btn--ghost"
      @click="emit('secondary')"
    >
      {{ secondary }}
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.controls__btn {
  min-width: min(72vw, 260px);
  min-height: 52px;
  padding: 0.85em 2.4em;
  border-radius: var(--radius-pill);
  font-size: var(--fs-button);
  letter-spacing: 0.14em;
  text-indent: 0.14em;
  transition:
    background-color 500ms var(--ease-soft),
    box-shadow 500ms var(--ease-soft),
    transform 300ms var(--ease-soft),
    border-color 500ms var(--ease-soft);
}

.controls__btn:active {
  transform: scale(0.97);
}

.controls__btn--primary {
  color: #06222c;
  font-weight: 600;
  background: linear-gradient(180deg, #b8ecf2, var(--c-cyan));
  box-shadow:
    0 0 24px rgba(142, 219, 228, 0.28),
    0 0 60px rgba(142, 219, 228, 0.1);
  border: 1px solid rgba(226, 248, 250, 0.6);
}

.controls__btn--primary:hover {
  box-shadow:
    0 0 32px rgba(142, 219, 228, 0.45),
    0 0 90px rgba(142, 219, 228, 0.16);
}

.controls__btn--ghost {
  color: var(--c-text-secondary);
  background: var(--c-glass);
  border: 1px solid var(--c-hairline);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.controls__btn--ghost:hover {
  color: var(--c-text);
  border-color: rgba(142, 219, 228, 0.45);
  background: rgba(13, 40, 58, 0.55);
}
</style>
