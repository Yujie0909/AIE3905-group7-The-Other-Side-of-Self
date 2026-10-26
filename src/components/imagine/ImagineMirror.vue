<script setup lang="ts">
import type { VisualState } from '../../types/imagine'

/** 中心镜面圆环 + 光晕，随视觉状态变化（IDLE/LISTENING/THINKING/REVEALING/WAITING/ERROR）。 */
defineProps<{ state: VisualState }>()
</script>

<template>
  <div class="mirror" :class="`mirror--${state}`" aria-hidden="true">
    <div class="mirror__halo"></div>
    <div class="mirror__ring"></div>
    <div class="mirror__core"></div>
  </div>
</template>

<style scoped>
.mirror {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(62vmin, 480px);
  height: min(62vmin, 480px);
  pointer-events: none;
}

.mirror__halo {
  position: absolute;
  inset: -34%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(142, 219, 228, 0.18), transparent 62%);
  opacity: 0.4;
  transition:
    opacity 1000ms var(--ease-soft),
    transform 1000ms var(--ease-soft);
}

.mirror__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(142, 219, 228, 0.25);
  box-shadow: 0 0 40px rgba(142, 219, 228, 0.08) inset;
  opacity: 0.55;
  transition:
    border-color 1000ms var(--ease-soft),
    box-shadow 1000ms var(--ease-soft),
    opacity 1000ms var(--ease-soft),
    transform 1000ms var(--ease-soft);
}

.mirror__core {
  position: absolute;
  inset: 20%;
  border-radius: 50%;
  border: 1px solid rgba(142, 219, 228, 0.12);
}

/* ── 状态映射 ── */
.mirror--idle .mirror__halo {
  opacity: 0.35;
  animation: breathe 9s var(--ease-soft) infinite alternate;
}

.mirror--listening .mirror__ring {
  border-color: rgba(142, 219, 228, 0.6);
  box-shadow: 0 0 80px rgba(142, 219, 228, 0.28) inset;
  opacity: 0.9;
}
.mirror--listening .mirror__halo {
  opacity: 0.72;
  transform: scale(1.06);
}

.mirror--thinking .mirror__ring {
  border-color: rgba(142, 219, 228, 0.42);
  box-shadow: 0 0 54px rgba(142, 219, 228, 0.16) inset;
  opacity: 0.75;
}
.mirror--thinking .mirror__halo {
  opacity: 0.5;
}

.mirror--revealing .mirror__ring {
  border-color: rgba(142, 219, 228, 0.72);
  box-shadow: 0 0 100px rgba(142, 219, 228, 0.34) inset;
  opacity: 1;
}
.mirror--revealing .mirror__halo {
  opacity: 0.85;
  transform: scale(1.09);
}

.mirror--waiting .mirror__ring {
  opacity: 0.6;
}

.mirror--error .mirror__ring {
  border-color: rgba(184, 200, 208, 0.28);
  box-shadow: 0 0 36px rgba(184, 200, 208, 0.1) inset;
  opacity: 0.6;
}

@keyframes breathe {
  from {
    opacity: 0.28;
    transform: scale(0.99);
  }
  to {
    opacity: 0.42;
    transform: scale(1.03);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mirror__halo {
    animation: none !important;
  }
}
</style>
