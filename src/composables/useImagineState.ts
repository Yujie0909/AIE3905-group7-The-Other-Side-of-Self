import { ref, computed } from 'vue'
import type {
  ImagineIntent,
  ConversationMessage,
  VisualState,
  InputMode,
  ConversationRequest,
} from '../types/imagine'
import { postConversation } from '../api/imagine'

function uid() {
  return crypto.randomUUID()
}

/**
 * Imagine 阶段状态机：真实 LLM 对话 + 视觉状态驱动。
 * 文字与语音统一进入 submit()；视觉状态（IDLE/LISTENING/THINKING/REVEALING/WAITING/ERROR）
 * 仅由真实事件更新，不靠固定定时器伪造。
 */
export function useImagineState() {
  const screen = ref<'enter' | 'dialog' | 'summary'>('enter')
  const visualState = ref<VisualState>('idle')
  const intent = ref<ImagineIntent | null>(null)
  const messages = ref<ConversationMessage[]>([])
  const currentResponse = ref('')
  const readyForClarify = ref(false)
  const error = ref<string | null>(null)
  const waitingHint = ref(false)

  const sessionId = uid()
  const lastSubmission = ref<{ text: string; mode: InputMode } | null>(null)
  let pendingId: string | null = null
  let waitingTimer: number | null = null

  const thinking = computed(() => visualState.value === 'thinking')

  function clearError() {
    error.value = null
  }

  function pushMessage(role: ConversationMessage['role'], text: string, mode?: InputMode) {
    messages.value.push({ id: uid(), role, text, input_mode: mode, created_at: Date.now() })
  }

  /** 由语音组件上报聆听状态，驱动光圈 */
  function setListening(listening: boolean) {
    if (listening && visualState.value !== 'thinking' && visualState.value !== 'revealing') {
      visualState.value = 'listening'
    } else if (!listening && visualState.value === 'listening') {
      visualState.value = 'idle'
    }
  }

  function startExpressing() {
    clearError()
    screen.value = 'dialog'
  }

  function notSure() {
    clearError()
    screen.value = 'dialog'
    // 不写死回复：把“没想好”作为真实输入交给模型，由 LLM 决定如何回应
    runAnalysis('我还没想好，也说不清自己想要什么。', 'text', true)
  }

  async function runAnalysis(t: string, mode: InputMode, pushUser: boolean) {
    clearError()
    lastSubmission.value = { text: t, mode }
    if (pushUser) pushMessage('user', t, mode)
    visualState.value = 'thinking'
    waitingHint.value = false

    const requestId = uid()
    pendingId = requestId
    waitingTimer = window.setTimeout(() => {
      if (visualState.value === 'thinking') waitingHint.value = true
    }, 4500)

    try {
      const payload: ConversationRequest = {
        session_id: sessionId,
        request_id: requestId,
        message: t,
        input_mode: mode,
        history: messages.value.slice(0, -1).map((m) => ({ role: m.role, text: m.text })),
        intent: intent.value,
        confirmed_values: intent.value?.confirmed_values ?? [],
        inferred_values: intent.value?.inferred_values ?? [],
      }
      const res = await postConversation(payload)
      if (res.request_id !== pendingId) return // 丢弃过期/乱序响应

      intent.value = res.intent
      currentResponse.value = res.assistant_response
      readyForClarify.value = res.ready_for_clarify
      if (res.assistant_response) pushMessage('assistant', res.assistant_response)
      visualState.value = 'revealing'
      if (waitingTimer !== null) window.clearTimeout(waitingTimer)
      window.setTimeout(() => {
        if (visualState.value === 'revealing') visualState.value = 'waiting'
      }, 900)
    } catch (e) {
      if (waitingTimer !== null) window.clearTimeout(waitingTimer)
      visualState.value = 'error'
      error.value = e instanceof Error ? e.message : '对话失败，请稍后再试。'
    }
  }

  function submit(text: string, mode: InputMode) {
    const t = text.trim()
    if (!t) return
    if (visualState.value === 'thinking') return // 防重复点击
    runAnalysis(t, mode, true)
  }

  function retry() {
    if (lastSubmission.value) runAnalysis(lastSubmission.value.text, lastSubmission.value.mode, false)
  }

  function resumeText() {
    clearError()
    visualState.value = 'waiting'
  }

  function seeSummary() {
    screen.value = 'summary'
  }

  function continueEdit() {
    clearError()
    screen.value = 'dialog'
    visualState.value = 'waiting'
  }

  return {
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
  }
}
