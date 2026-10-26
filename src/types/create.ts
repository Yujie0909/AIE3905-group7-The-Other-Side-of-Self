/** 第三阶段 Create / Inner World 的共享类型 */

export interface GenerationRevision {
  lighting?: 'softer' | 'more_contrast'
  atmosphere?: 'calmer' | 'warmer'
  openness?: 'more' | 'less'
}

export interface GenerationRequest {
  intent: unknown
  corrections?: string[]
  world_id?: string
  scene_id?: string
  reference_asset_ids?: string[]
  role_map?: Record<string, string>
  revisions?: GenerationRevision | null
}

export interface GenerationReferenceCandidate {
  asset_id: string
  title: string
  categories: string[]
  reference_roles: string[]
  caption: string
  thumbnail_uri: string | null
  file_status?: 'present' | 'missing' | 'no_uri'
}

export type GenerationStatus =
  | 'preparing'
  | 'generating'
  | 'succeeded'
  | 'failed'

export interface GenerationJob {
  job_id: string
  world_id: string | null
  status: GenerationStatus
  model_id: string | null
  prompt_version: string | null
  prompt_record: unknown
  reference_asset_ids: string[]
  generation_parameters: { size?: string; model?: string } | null
  revisions: GenerationRevision | null
  result_image_uri: string | null
  selected: boolean
  created_at: string
  completed_at: string | null
  error_code: string | null
  error_message: string | null
}

export interface GenerationReference {
  asset_id: string
  role: string
  title: string
}
