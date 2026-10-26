<script setup lang="ts">
import { ref } from 'vue'
import type { ImagineIntent, VisualState } from '../../types/imagine'

/**
 * 开发调试覆盖层：仅在 import.meta.env.DEV 下由父组件渲染。
 * 正式演示模式（生产构建）不渲染，避免覆盖观众体验。
 * 提供关闭按钮；状态可折叠。
 */
defineProps<{ intent: ImagineIntent; visualState: VisualState }>()

const open = ref(true)
</script>

<template>
  <div v-if="open" class="debug">
    <div class="debug__head">
      <span>DEV · 意图与状态</span>
      <button type="button" class="debug__close" @click="open = false">收起</button>
    </div>
    <pre class="debug__body">{{ JSON.stringify({ visualState, intent }, null, 2) }}</pre>
  </div>
</template>

<style scoped>
.debug {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 20;
  width: min(40vw, 340px);
  max-height: 50vh;
  overflow: auto;
  background: rgba(4, 14, 22, 0.82);
  border: 1px solid var(--c-hairline);
  border-radius: 10px;
  font-size: 11px;
  color: var(--c-cyan);
  backdrop-filter: blur(6px);
  /* 关键修复：调试面板是覆盖层，绝不拦截页面点击（透明覆盖层导致按钮无响应）。
     仅“收起”按钮恢复可交互。 */
  pointer-events: none;
}
.debug__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid var(--c-hairline);
  color: var(--c-text-secondary);
}
.debug__close {
  color: var(--c-text-secondary);
  font-size: 11px;
  padding: 2px 6px;
  /* 仅此按钮需要可点击；其余区域对鼠标事件透明。 */
  pointer-events: auto;
}
.debug__body {
  margin: 0;
  padding: 8px 10px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
</style>
