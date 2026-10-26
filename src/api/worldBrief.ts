import type { ImagineIntent } from '../types/imagine'

/** 后端 /api/world-brief/assemble 的响应（仅组装与校验，不调用生成 API） */
export interface WorldBriefResponse {
  visual_bible_version: string
  prompt_version: string
  world_brief: unknown
  assembled_prompts: {
    image: string
    video: string
  }
  validation: {
    valid: boolean
    errors: { path: string; message: string | undefined }[]
  }
  doubao: {
    enabled: boolean
    image_model: string | null
    video_model: string | null
    note: string
    demo_status: string
  }
}

export interface WorldBriefRequest {
  intent: ImagineIntent
  corrections?: string[]
  world_id?: string
  scene_id?: string
  reference_asset_ids?: string[]
}

/**
 * 调用后端组装 World Brief。仅组装提示词 + 校验，不生成图像。
 * 密钥保留在服务端，前端不持有。
 */
export async function postWorldBrief(payload: WorldBriefRequest): Promise<WorldBriefResponse> {
  const res = await fetch('/api/world-brief/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data?.error ? `：${data.error}` : ''
    } catch {
      /* ignore */
    }
    throw new Error(`基准组装失败（${res.status}）${detail}`)
  }
  return (await res.json()) as WorldBriefResponse
}
