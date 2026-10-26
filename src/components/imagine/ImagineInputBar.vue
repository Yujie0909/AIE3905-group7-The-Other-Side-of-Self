<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useSpeechRecognition } from '../../composables/useSpeechRecognition'
import type { InputMode, VoiceState } from '../../types/imagine'

const props = defineProps<{ busy?: boolean; placeholder?: string }>()
const emit = defineEmits<{
  submit: [text: string, mode: InputMode]
  listening: [on: boolean]
}>()

const draft = ref('')
const fromVoice = ref(false)
const expanded = ref(false)
const field = ref<HTMLTextAreaElement | null>(null)

const { supported, voiceState, note, start, stop } = useSpeechRecognition({
  onFinal: (t) => {
    draft.value = t
    fromVoice.value = true
  },
  onInterim: (t) => {
    draft.value = t
  },
  onState: (s: VoiceState) => emit('listening', s === 'listening'),
})

function expand() {
  expanded.value = true
  nextTick(() => field.value?.focus())
}

function voiceLabel(): string {
  if (voiceState.value === 'listening') return '正在聆听…（点击停止）'
  if (voiceState.value === 'transcribing') return '正在整理你的话语…'
  if (voiceState.value === 'denied' || voiceState.value === 'no-device') return '语音暂不可用'
  if (voiceState.value === 'unsupported') return '语音输入不可用'
  if (voiceState.value === 'error') return '语音出现问题'
  return '点击说话'
}

function onVoiceClick() {
  if (voiceState.value === 'listening') stop()
  else start()
}

function onSend() {
  const t = draft.value.trim()
  if (!t || props.busy) return
  emit('submit', t, fromVoice.value ? 'speech' : 'text')
  draft.value = ''
  fromVoice.value = false
}

function onClear() {
  draft.value = ''
  fromVoice.value = false
}
</script>

<template>
  <div class="inputbar">
    <button v-if="!expanded" type="button" class="inputbar__quick" @click="expand">
      写点什么…（点击展开）
    </button>

    <template v-else>
      <textarea
        ref="field"
        v-model="draft"
        class="inputbar__field"
        :placeholder="placeholder || '你最先想到的是什么？可以慢慢说…'"
        rows="2"
        :disabled="busy"
        @keydown.enter.exact.prevent="onSend"
      ></textarea>

      <div class="inputbar__row">
        <button
          type="button"
          class="inputbar__voice"
          :class="{ 'is-listening': voiceState === 'listening' }"
          :disabled="!supported || voiceState === 'transcribing' || busy"
          :aria-label="voiceLabel()"
          @click="onVoiceClick"
        >
          <span class="inputbar__mic" aria-hidden="true"></span>
          <span>{{ voiceLabel() }}</span>
        </button>

        <div class="inputbar__actions">
          <button v-if="draft" type="button" class="inputbar__text-btn" @click="onClear">清除</button>
          <button type="button" class="inputbar__send" :disabled="!draft.trim() || busy" @click="onSend">
            {{ busy ? '整理中…' : '发送' }}
          </button>
        </div>
      </div>
    </template>

    <p v-if="note" class="inputbar__note">{{ note }}</p>
  </div>
</template>

<style scoped>
.inputbar {
  width: min(90vw, 560px);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.inputbar__quick {
  width: 100%;
  padding: 0.85em 1.2em;
  border-radius: var(--radius-pill);
  text-align: left;
  color: rgba(184, 200, 208, 0.7);
  background: var(--c-glass);
  border: 1px solid var(--c-hairline);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 0.98rem;
  transition: color 400ms var(--ease-soft), border-color 400ms var(--ease-soft);
}

.inputbar__quick:hover {
  color: var(--c-text);
  border-color: rgba(142, 219, 228, 0.45);
}

.inputbar__field {
  width: 100%;
  resize: none;
  padding: 0.9em 1.1em;
  border-radius: var(--radius-soft);
  background: var(--c-glass);
  border: 1px solid var(--c-hairline);
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.7;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color 400ms var(--ease-soft);
}

.inputbar__field::placeholder {
  color: rgba(184, 200, 208, 0.45);
}

.inputbar__field:focus {
  outline: none;
  border-color: rgba(142, 219, 228, 0.5);
}

.inputbar__field:disabled {
  opacity: 0.6;
}

.inputbar__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.inputbar__voice {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  min-height: 46px;
  padding: 0 1.2em;
  border-radius: var(--radius-pill);
  color: var(--c-text-secondary);
  background: rgba(13, 40, 58, 0.45);
  border: 1px solid var(--c-hairline);
  font-size: 0.92rem;
  transition: border-color 400ms var(--ease-soft), color 400ms var(--ease-soft);
}

.inputbar__voice:hover:not(:disabled) {
  color: var(--c-text);
  border-color: rgba(142, 219, 228, 0.45);
}

.inputbar__voice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.inputbar__voice.is-listening {
  color: var(--c-cyan);
  border-color: rgba(142, 219, 228, 0.6);
  animation: voice-pulse 2s var(--ease-soft) infinite;
}

@keyframes voice-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(142, 219, 228, 0.3);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(142, 219, 228, 0);
  }
}

.inputbar__mic {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: currentColor;
}

.inputbar__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.inputbar__text-btn {
  min-height: 46px;
  padding: 0 1em;
  color: rgba(184, 200, 208, 0.7);
  font-size: 0.9rem;
}

.inputbar__text-btn:hover {
  color: var(--c-text);
}

.inputbar__send {
  min-height: 46px;
  padding: 0 1.8em;
  border-radius: var(--radius-pill);
  font-weight: 600;
  color: #06222c;
  background: linear-gradient(180deg, #b8ecf2, var(--c-cyan));
  border: 1px solid rgba(226, 248, 250, 0.6);
  transition: box-shadow 400ms var(--ease-soft), opacity 300ms var(--ease-soft);
}

.inputbar__send:hover:not(:disabled) {
  box-shadow: 0 0 28px rgba(142, 219, 228, 0.4);
}

.inputbar__send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.inputbar__note {
  margin: 0.2em 0 0;
  font-size: 0.82rem;
  color: rgba(213, 198, 160, 0.85);
}
</style>
