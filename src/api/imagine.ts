import type { ConversationRequest, ConversationResponse } from '../types/imagine'

/**
 * 第二阶段对话 API 客户端。
 * 仅调用后端 /api/imagine/conversation，密钥保留在服务端，前端不持有任何密钥。
 */
export async function postConversation(
  payload: ConversationRequest,
  signal?: AbortSignal,
): Promise<ConversationResponse> {
  const res = await fetch('/api/imagine/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })

  if (!res.ok) {
    let detail = ''
    let code = ''
    try {
      const data = await res.json()
      detail = data?.error ? `：${data.error}` : ''
      code = data?.code || ''
    } catch {
      /* ignore */
    }
    if (res.status === 503) {
      throw new Error('意图解析服务尚未配置（缺少 API 密钥）。你可以先继续使用文字输入。')
    }
    if (res.status === 403 && code === 'insufficient_balance') {
      throw new Error('DeepSeek 账户余额不足，暂时无法调用模型。请充值后重试，或先继续使用文字输入。')
    }
    if (res.status === 429) {
      throw new Error('请求过于频繁，请稍等片刻再继续。')
    }
    throw new Error(`对话服务暂时不可用（${res.status}）${detail}`)
  }

  return (await res.json()) as ConversationResponse
}
