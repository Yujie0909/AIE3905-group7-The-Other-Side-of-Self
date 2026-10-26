<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * 沉浸式微光粒子系统（Canvas，无额外依赖）。
 * - 三层景深：远景更暗更慢更小，近景略大但数量少。
 * - 缓慢漂移 + 淡入淡出 + 轻微亮度变化，不闪烁、不网格、不爆炸。
 * - 数量与速度可调；尊重 prefers-reduced-motion（显著减少）。
 * - 仅在组件内维护 rAF，卸载时清理。
 */
const props = withDefaults(
  defineProps<{ count?: number }>(),
  { count: 70 },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let raf = 0
let particles: any[] = []
let w = 0
let h = 0
let dpr = 1
let reduced = false

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function makeParticles() {
  const area = w * h
  // 依据屏幕面积与 reduced-motion 调整数量（桌面约 50–90）
  let n = props.count
  if (area < 700_000) n = Math.round(n * 0.6)
  if (reduced) n = Math.min(18, Math.round(n * 0.3))
  const cx = w / 2
  const cy = h / 2
  const maxR = Math.min(w, h) * 0.42

  particles = Array.from({ length: n }, () => {
    const depth = Math.random() // 0 远 → 1 近
    const nearCenter = Math.random() < 0.35
    const angle = rand(0, Math.PI * 2)
    const radius = nearCenter ? rand(maxR * 0.2, maxR * 0.7) : rand(maxR * 0.5, maxR * 1.25)
    return {
      depth,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      baseR: rand(0.6, 2.4) * (0.5 + depth * 0.9),
      vx: rand(-0.06, 0.06) * (0.4 + depth),
      vy: rand(-0.05, 0.05) * (0.4 + depth),
      alpha: rand(0.12, 0.5) * (0.5 + depth * 0.6),
      twPhase: rand(0, Math.PI * 2),
      twSpeed: rand(0.2, 0.6),
      bright: nearCenter ? 1 : 0.7,
    }
  })
}

function resize() {
  if (!canvas.value) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = canvas.value.clientWidth
  h = canvas.value.clientHeight
  canvas.value.width = w * dpr
  canvas.value.height = h * dpr
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  makeParticles()
}

let t0 = 0
function frame(ts: number) {
  if (!ctx) return
  const dt = t0 ? Math.min(0.05, (ts - t0) / 1000) : 0.016
  t0 = ts
  ctx.clearRect(0, 0, w, h)
  const cx = w / 2
  const cy = h / 2

  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    // 轻微回拉，避免整体漂出
    const dx = p.x - cx
    const dy = p.y - cy
    p.vx -= dx * 0.00002
    p.vy -= dy * 0.00002

    p.twPhase += p.twSpeed * dt
    const tw = 0.6 + 0.4 * Math.sin(p.twPhase)
    const a = Math.max(0, Math.min(1, p.alpha * tw))

    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.baseR * 3)
    const c = p.bright > 0.9 ? '200, 240, 245' : '142, 219, 228'
    g.addColorStop(0, `rgba(${c}, ${a})`)
    g.addColorStop(1, 'rgba(142, 219, 228, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.baseR * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  raf = requestAnimationFrame(frame)
}

onMounted(() => {
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  if (reduced) {
    // reduced-motion：只绘制静态一帧
    frame(0)
    cancelAnimationFrame(raf)
  } else {
    raf = requestAnimationFrame(frame)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <canvas ref="canvas" class="particles" aria-hidden="true"></canvas>
</template>

<style scoped>
.particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
