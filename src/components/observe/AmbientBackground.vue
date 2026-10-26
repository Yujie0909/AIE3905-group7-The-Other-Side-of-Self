<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * 全屏动态深海背景：纯 CSS 实现，无视频、无 WebGL。
 * - base：深海纵向渐变
 * - rays：顶部水下光柱（两簇，缓慢摇曳）
 * - glow：中景青蓝光晕
 * - surface：水面高光带
 * - particles：少量缓慢上浮的微粒
 * - mirror：镜面反射质感层（transition 状态淡入，之后保留）
 */
defineProps<{ mirror?: boolean }>()

interface Particle {
  id: number
  left: string
  size: string
  duration: string
  delay: string
  drift: string
}

const particles = ref<Particle[]>([])

onMounted(() => {
  // 仅生成一次，避免重渲染闪烁；数量克制，降低渲染成本
  particles.value = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 96 + 2}%`,
    size: `${(Math.random() * 2.4 + 1.2).toFixed(1)}px`,
    duration: `${(Math.random() * 22 + 26).toFixed(1)}s`,
    delay: `${(-Math.random() * 40).toFixed(1)}s`,
    drift: `${(Math.random() * 10 - 5).toFixed(1)}vw`,
  }))
})
</script>

<template>
  <div class="ambient" aria-hidden="true">
    <div class="ambient__base"></div>
    <div class="ambient__glow"></div>

    <div class="ambient__rays">
      <span class="ray ray--a"></span>
      <span class="ray ray--b"></span>
      <span class="ray ray--c"></span>
    </div>

    <div class="ambient__surface"></div>

    <div class="ambient__particles">
      <span
        v-for="p in particles"
        :key="p.id"
        class="particle"
        :style="{
          left: p.left,
          width: p.size,
          height: p.size,
          animationDuration: p.duration,
          animationDelay: p.delay,
          '--drift': p.drift,
        }"
      ></span>
    </div>

    <!-- 镜面反射质感层：TRANSITION 时淡入 -->
    <div class="ambient__mirror" :class="{ 'ambient__mirror--on': mirror }"></div>

    <div class="ambient__vignette"></div>
  </div>
</template>

<style scoped>
.ambient {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--c-bg);
  /* 全屏装饰背景层：纯展示、aria-hidden，禁止拦截任何页面交互。 */
  pointer-events: none;
}

/* ── 深海底色 ─────────────────────────────── */
.ambient__base {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      #04121f 0%,
      var(--c-navy) 26%,
      #083850 58%,
      var(--c-ocean) 82%,
      #04283c 100%
    );
}

/* ── 中景光晕 ─────────────────────────────── */
.ambient__glow {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(
      58% 44% at 50% 12%,
      rgba(142, 219, 228, 0.16),
      transparent 70%
    ),
    radial-gradient(
      70% 55% at 50% 55%,
      rgba(13, 120, 133, 0.22),
      transparent 72%
    );
  animation: glow-breathe 16s var(--ease-soft) infinite alternate;
}

@keyframes glow-breathe {
  from {
    opacity: 0.75;
    transform: scale(1);
  }
  to {
    opacity: 1;
    transform: scale(1.045);
  }
}

/* ── 水下光柱 ─────────────────────────────── */
.ambient__rays {
  position: absolute;
  inset: 0;
  filter: blur(22px);
}

.ray {
  position: absolute;
  top: -12%;
  height: 88%;
  width: clamp(70px, 9vw, 150px);
  background: linear-gradient(
    180deg,
    rgba(142, 219, 228, 0.34),
    rgba(142, 219, 228, 0.1) 45%,
    transparent 82%
  );
  transform-origin: top center;
  mix-blend-mode: screen;
}

.ray--a {
  left: 26%;
  transform: rotate(7deg);
  animation: ray-sway-a 14s ease-in-out infinite alternate;
}

.ray--b {
  left: 46%;
  width: clamp(110px, 14vw, 220px);
  opacity: 0.85;
  transform: rotate(2deg);
  animation: ray-sway-b 18s ease-in-out infinite alternate;
}

.ray--c {
  left: 66%;
  transform: rotate(-6deg);
  opacity: 0.7;
  animation: ray-sway-c 16s ease-in-out infinite alternate;
}

@keyframes ray-sway-a {
  from {
    transform: rotate(7deg) scaleX(1);
    opacity: 0.75;
  }
  to {
    transform: rotate(10deg) scaleX(1.15);
    opacity: 1;
  }
}

@keyframes ray-sway-b {
  from {
    transform: rotate(2deg) scaleX(1.1);
    opacity: 0.7;
  }
  to {
    transform: rotate(-2deg) scaleX(0.95);
    opacity: 1;
  }
}

@keyframes ray-sway-c {
  from {
    transform: rotate(-6deg);
    opacity: 0.55;
  }
  to {
    transform: rotate(-9deg) scaleX(1.1);
    opacity: 0.85;
  }
}

/* ── 水面高光带 ───────────────────────────── */
.ambient__surface {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 16%;
  background: linear-gradient(
    180deg,
    rgba(190, 235, 240, 0.2),
    rgba(142, 219, 228, 0.05) 55%,
    transparent
  );
  filter: blur(6px);
  animation: surface-shimmer 11s ease-in-out infinite alternate;
}

@keyframes surface-shimmer {
  from {
    opacity: 0.7;
    transform: translateX(-1.5%);
  }
  to {
    opacity: 1;
    transform: translateX(1.5%);
  }
}

/* ── 漂浮微粒 ─────────────────────────────── */
.ambient__particles {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  bottom: -2%;
  border-radius: 50%;
  background: rgba(190, 232, 238, 0.5);
  box-shadow: 0 0 6px 1px rgba(142, 219, 228, 0.35);
  opacity: 0;
  animation-name: particle-rise;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes particle-rise {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0;
  }
  12% {
    opacity: 0.55;
  }
  85% {
    opacity: 0.35;
  }
  100% {
    transform: translate3d(var(--drift, 0vw), -108vh, 0);
    opacity: 0;
  }
}

/* ── 镜面反射质感层（TRANSITION 用）───────── */
.ambient__mirror {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--dur-morph) var(--ease-soft);
  background:
    radial-gradient(
      52% 40% at 50% 46%,
      rgba(173, 226, 235, 0.1),
      transparent 70%
    ),
    linear-gradient(
      180deg,
      rgba(23, 52, 72, 0) 0%,
      rgba(23, 52, 72, 0.24) 38%,
      rgba(6, 17, 29, 0.55) 78%
    );
}

.ambient__mirror::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(72vw, 640px);
  height: min(72vh, 560px);
  transform: translate(-50%, -50%);
  border: 1px solid rgba(142, 219, 228, 0.14);
  border-radius: 50%;
  box-shadow:
    0 0 90px rgba(142, 219, 228, 0.08) inset,
    0 0 60px rgba(142, 219, 228, 0.05);
  opacity: 0;
  transition: opacity var(--dur-morph) var(--ease-soft);
}

.ambient__mirror--on {
  opacity: 1;
}

.ambient__mirror--on::before {
  opacity: 1;
}

/* ── 暗角，保证文字对比度 ─────────────────── */
.ambient__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    120% 100% at 50% 42%,
    transparent 52%,
    rgba(2, 8, 14, 0.55) 100%
  );
}
</style>
