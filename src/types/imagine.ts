/** 第二阶段 Imagine 的共享类型定义（重构版） */

export type InputMode = 'text' | 'speech'

/** 语音识别状态 */
export type VoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'denied'
  | 'unsupported'
  | 'no-device'
  | 'error'

/** 视觉状态（由真实事件驱动，不靠固定定时器伪造） */
export type VisualState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'revealing'
  | 'waiting'
  | 'error'

export type Confidence = 'high' | 'medium' | 'low' | 'none'

export type DialogueAction =
  | 'respond'
  | 'ask'
  | 'clarify'
  | 'summarize'
  | 'ready_for_clarify'

export interface ImagineScene {
  description: string
  location: string
  environment: string[]
  confidence: Confidence
}

/** 统一意图对象（传入第三阶段 Clarify） */
export interface ImagineIntent {
  scene: ImagineScene
  activities: string[]
  daily_rhythm: string | null
  social_context: string | null
  desired_values: string[]
  inferred_values: string[]
  confirmed_values: string[]
  visual_elements: string[]
  avoid: string[]
  uncertainties: string[]
  missing_information: string[]
  ready_for_clarify: boolean
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  input_mode?: InputMode
  created_at: number
}

/** 后端对话请求 */
export interface ConversationRequest {
  session_id: string
  request_id: string
  message: string
  input_mode: InputMode
  history: { role: 'user' | 'assistant'; text: string }[]
  intent: ImagineIntent | null
  confirmed_values: string[]
  inferred_values: string[]
}

/** 后端对话响应（reason_for_transition 仅程序使用，不展示给观众） */
export interface ConversationResponse {
  session_id: string
  request_id: string
  assistant_response: string
  dialogue_action: DialogueAction
  should_ask_question: boolean
  next_question: string | null
  intent: ImagineIntent
  confirmed_values: string[]
  inferred_values: string[]
  missing_information: string[]
  ready_for_clarify: boolean
  reason_for_transition: string
}
