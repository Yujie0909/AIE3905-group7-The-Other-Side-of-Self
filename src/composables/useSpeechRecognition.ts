import { ref, onUnmounted } from 'vue'
import type { VoiceState } from '../types/imagine'

/**
 * 浏览器原生语音识别封装（SpeechRecognition / webkitSpeechRecognition）。
 *
 * 已修复的历史问题：
 * 1. 非安全上下文（如通过局域网 IP 而非 localhost/HTTPS 访问）时 SpeechRecognition 为
 *    undefined，应明确标记为 unsupported，而不是含糊的“语音暂不可用”。
 * 2. 终值已送达后 onend 未把状态从 transcribing 复位，导致按钮卡在“正在整理”。
 *    现在：送达终值 → transcribing → onend 复位 idle；无终值结束 → 视为未听清。
 * 3. 错误码被统一成“语音识别出现问题”。现在按规范区分权限拒绝 / 无设备 / 无语音 /
 *    网络 / 不支持 / 识别服务不可用。
 *
 * 仅由用户主动点击启动；识别结果进入统一文本提交流程，不在此做意图解析。
 */
export function useSpeechRecognition(opts: {
  onFinal: (text: string) => void
  onInterim?: (text: string) => void
  onState?: (state: VoiceState) => void
} = { onFinal: () => {} }) {
  const supported = ref(true)
  const voiceState = ref<VoiceState>('idle')
  const note = ref('')

  const SR: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  supported.value = !!SR
  if (!SR) {
    voiceState.value = 'unsupported'
    note.value = '当前浏览器暂不支持语音输入，你仍然可以继续输入文字。'
  }

  let recognition: any = null
  let cancelled = false
  let finalText = ''
  let gotFinal = false

  function setState(s: VoiceState) {
    voiceState.value = s
    opts.onState?.(s)
  }

  function start() {
    if (!SR) {
      setState('unsupported')
      note.value = '当前浏览器暂不支持语音输入，你仍然可以继续输入文字。'
      return
    }
    if (voiceState.value === 'listening') return // 防重复启动
    try {
      recognition = new SR()
      recognition.lang = 'zh-CN'
      recognition.interimResults = true
      recognition.continuous = false
      recognition.maxAlternatives = 1
      cancelled = false
      finalText = ''
      gotFinal = false

      recognition.onstart = () => setState('listening')

      recognition.onresult = (e: any) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalText += r[0].transcript
          else interim += r[0].transcript
        }
        if (finalText) {
          gotFinal = true
          opts.onFinal(finalText)
          setState('transcribing') // 短暂的整理态，onend 后复位
        } else if (interim && opts.onInterim) {
          opts.onInterim(interim)
        }
      }

      recognition.onerror = (e: any) => {
        const err = e?.error
        switch (err) {
          case 'not-allowed':
          case 'service-not-allowed':
            setState('denied')
            note.value = '暂时无法使用麦克风。你可以检查浏览器权限，或直接输入文字。'
            break
          case 'audio-capture':
            setState('no-device')
            note.value = '没有检测到可用的麦克风，请检查设备设置。'
            break
          case 'no-speech':
            setState('error')
            note.value = '刚才没有听清。你可以再试一次，也可以直接输入。'
            break
          case 'network':
            setState('error')
            note.value = '语音处理暂时没有完成。你可以重试，或继续使用文字输入。'
            break
          case 'aborted':
            // 用户主动取消，忽略
            break
          default:
            setState('error')
            note.value = '语音识别出现问题，你可以再试一次，或直接使用文字输入。'
        }
      }

      recognition.onend = () => {
        if (cancelled) {
          setState('idle')
          return
        }
        if (gotFinal) {
          // 终值已交付，回到可编辑态（文本保留在输入框）
          setState('idle')
        } else {
          // 识别结束但没有任何结果：视为未听清，不卡在聆听
          setState('idle')
          note.value = '刚才没有听清。你可以再试一次，也可以直接输入。'
        }
      }

      note.value = ''
      recognition.start()
    } catch {
      setState('error')
      note.value = '暂时无法启动语音识别，你可以直接使用文字输入。'
    }
  }

  function stop() {
    try {
      recognition?.stop()
    } catch {
      /* ignore */
    }
  }

  function cancel() {
    cancelled = true
    try {
      recognition?.abort()
    } catch {
      /* ignore */
    }
    setState('idle')
    note.value = ''
  }

  onUnmounted(() => {
    try {
      recognition?.abort()
    } catch {
      /* ignore */
    }
  })

  return { supported, voiceState, note, start, stop, cancel }
}
