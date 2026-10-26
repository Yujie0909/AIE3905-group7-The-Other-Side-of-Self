import type {
  GenerationJob,
  GenerationReferenceCandidate,
  GenerationRequest,
} from '../types/create'

async function parseError(res: Response): Promise<Error> {
  let detail = ''
  let code = ''
  try {
    const data = await res.json()
    detail = data?.error ? `：${data.error}` : ''
    code = data?.code || ''
  } catch {
    /* ignore */
  }
  if (res.status === 401 || res.status === 403) {
    return new Error('图像生成授权失败，请检查服务端配置。')
  }
  if (res.status === 429) {
    return new Error('图像服务调用过于频繁，请稍后重试。')
  }
  if (res.status === 422) {
    return new Error(`请求校验未通过（${res.status}）${detail}`)
  }
  if (res.status >= 500) {
    return new Error('图像生成服务暂时不可用。')
  }
  return new Error(`生成服务暂时不可用（${res.status}）${detail}${code ? ` [${code}]` : ''}`)
}

/** 创建并异步发起一次生成任务；后端立即返回 job，前端轮询状态。 */
export async function postGeneration(payload: GenerationRequest): Promise<GenerationJob> {
  const res = await fetch('/api/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  const data = (await res.json()) as { job: GenerationJob }
  return data.job
}

export async function getGeneration(jobId: string): Promise<GenerationJob> {
  const res = await fetch(`/api/generations/${encodeURIComponent(jobId)}`)
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as GenerationJob
}

export async function listGenerations(worldId: string | null): Promise<GenerationJob[]> {
  const qs = worldId ? `?world_id=${encodeURIComponent(worldId)}` : ''
  const res = await fetch(`/api/generations${qs}`)
  if (!res.ok) throw await parseError(res)
  const data = (await res.json()) as { jobs: GenerationJob[] }
  return data.jobs
}

export async function selectGeneration(jobId: string): Promise<GenerationJob> {
  const res = await fetch(`/api/generations/${encodeURIComponent(jobId)}/select`, { method: 'POST' })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as GenerationJob
}

/** 已批准、未归档的候选参考素材（供观众选择，不暴露任何管理字段）。 */
export async function getReferenceCandidates(): Promise<GenerationReferenceCandidate[]> {
  const res = await fetch('/api/generations/references')
  if (!res.ok) throw await parseError(res)
  const data = (await res.json()) as { candidates: GenerationReferenceCandidate[] }
  return data.candidates || []
}
