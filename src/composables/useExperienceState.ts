import { ref } from 'vue'

/**
 * 体验阶段状态机（第一阶段 Observe）
 *
 * 状态流转（严格遵守）：
 *   WELCOME ──开始探索──▶ START_TRANSITION ──继续──▶ IMAGINE_INTRO
 *      │                                                    │
 *      └──── 再停留一会儿 ──▶ PAUSE ──开始探索──▶ START_TRANSITION
 *              │                                     │
 *              └──── 再停留一会儿（保持，不追加） ────┘
 *
 *   PAUSE → PAUSE（重复点击不再追加文案、不跳转）
 *   任意状态 → 返回镜面 / 重置 → WELCOME
 *
 * 注意：START_TRANSITION 不再自动跳转 Imagine，AI 回应显示完成后
 * 才通过 continueReady 暴露「继续」入口，由观众主动进入下一阶段。
 */
export type StageState = 'welcome' | 'pause' | 'startTransition' | 'imagine_intro'

export function useExperienceState() {
  const state = ref<StageState>('welcome')
  /** AI 探索回应显示完成后才为 true，用于揭示「继续」入口，避免过早跳转 */
  const continueReady = ref(false)

  let revealTimer: number | null = null

  function clearTimers() {
    if (revealTimer !== null) {
      window.clearTimeout(revealTimer)
      revealTimer = null
    }
    continueReady.value = false
  }

  /** 「再停留一会儿」：WELCOME → PAUSE；PAUSE → 保持（不追加、不跳转） */
  function stay() {
    if (state.value === 'startTransition' || state.value === 'imagine_intro') return
    clearTimers()
    state.value = 'pause'
  }

  /** 「开始探索」：WELCOME 或 PAUSE → START_TRANSITION；其余状态忽略，防重复点击 */
  function beginExplore() {
    if (state.value === 'startTransition' || state.value === 'imagine_intro') return
    clearTimers()
    state.value = 'startTransition'
    // 回应淡入后（约 1.8s）才允许进入 Imagine
    revealTimer = window.setTimeout(() => {
      revealTimer = null
      continueReady.value = true
    }, 1800)
  }

  /** 「继续」：START_TRANSITION → IMAGINE_INTRO */
  function continueToImagine() {
    if (state.value !== 'startTransition') return
    clearTimers()
    state.value = 'imagine_intro'
  }

  /** 「返回镜面」：回到初始 WELCOME（镜面不重置） */
  function backToMirror() {
    clearTimers()
    state.value = 'welcome'
  }

  /** 接口位：接入 Imagine 阶段。当前 MVP 占位回到初始，保证可重复 */
  function beginImagine() {
    clearTimers()
    state.value = 'welcome'
  }

  /** 退出 / 重置：清理临时状态，回到干净的 WELCOME */
  function reset() {
    clearTimers()
    state.value = 'welcome'
  }

  return {
    state,
    continueReady,
    stay,
    beginExplore,
    continueToImagine,
    backToMirror,
    beginImagine,
    reset,
  }
}
