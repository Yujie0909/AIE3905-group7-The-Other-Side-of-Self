export type AssetType = 'image' | 'video' | 'other'
export type SourceType = 'original' | 'licensed' | 'generated' | 'pending_review'
export type LicenseStatus = 'approved' | 'pending' | 'restricted' | 'rejected'
export type ReferenceRole = 'scene' | 'style' | 'composition' | 'motion' | 'lighting' | 'material'
export type ReviewStatus = 'draft' | 'approved'

export interface VisualAsset {
  asset_id: string
  title: string
  asset_type: AssetType
  source_type: SourceType
  source_uri: string | null
  thumbnail_uri: string | null
  caption: string
  categories: string[]
  scene_tags: string[]
  activity_tags: string[]
  visual_tags: string[]
  mood_tags: string[]
  reference_roles: ReferenceRole[]
  license_status: LicenseStatus
  license_notes: string
  quality_score: number | null
  benchmark_scene_ids: string[]
  review_status?: ReviewStatus
  draft_metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  archived: boolean
  file_status?: 'present' | 'missing' | 'no_uri'
}

export interface AssetCategory {
  id: string
  label: string
  description: string
}
export interface ReferenceRoleDef {
  id: string
  label: string
  description: string
}
export interface BenchmarkSceneLite {
  scene_id: string
  title: string
  category: string
}

export interface LibraryMeta {
  categories: AssetCategory[]
  reference_roles: ReferenceRoleDef[]
  benchmark_scenes: BenchmarkSceneLite[]
  asset_types: AssetType[]
  source_types: SourceType[]
  license_statuses: LicenseStatus[]
}

export interface AssetFilters {
  q: string
  category: string
  reference_role: string
  license_status: string
  review_status: string
  tag: string
  benchmark_scene_id: string
  include_archived: boolean
}

export interface ReferenceSelection {
  groups: Record<ReferenceRole, { asset_id: string; title: string; source_uri: string | null; usable: boolean; reason: string | null }[]>
  invalid: { asset_id: string; reason: string }[]
  generated_at: string
  note: string
}

export interface CreateAssetInput {
  title: string
  asset_type: AssetType
  source_type: SourceType
  license_status: LicenseStatus
  categories: string[]
  reference_roles: ReferenceRole[]
  caption?: string
  source_uri?: string | null
  thumbnail_uri?: string | null
  scene_tags?: string[]
  activity_tags?: string[]
  visual_tags?: string[]
  mood_tags?: string[]
  license_notes?: string
  quality_score?: number | null
  benchmark_scene_ids?: string[]
}
