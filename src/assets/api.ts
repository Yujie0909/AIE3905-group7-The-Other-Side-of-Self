import type {
  VisualAsset,
  LibraryMeta,
  AssetFilters,
  ReferenceSelection,
  CreateAssetInput,
} from './types'

function qs(f: AssetFilters): string {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('category', f.category)
  if (f.reference_role) p.set('reference_role', f.reference_role)
  if (f.license_status) p.set('license_status', f.license_status)
  if (f.review_status) p.set('review_status', f.review_status)
  if (f.tag) p.set('tag', f.tag)
  if (f.benchmark_scene_id) p.set('benchmark_scene_id', f.benchmark_scene_id)
  if (f.include_archived) p.set('include_archived', '1')
  const s = p.toString()
  return s ? '?' + s : ''
}

export async function fetchMeta(): Promise<LibraryMeta> {
  const res = await fetch('/api/assets/meta')
  if (!res.ok) throw new Error('加载元数据失败')
  return (await res.json()) as LibraryMeta
}

export async function fetchAssets(f: AssetFilters): Promise<VisualAsset[]> {
  const res = await fetch('/api/assets' + qs(f))
  if (!res.ok) throw new Error('加载素材失败')
  const data = (await res.json()) as { assets: VisualAsset[] }
  return data.assets
}

export async function fetchAsset(id: string): Promise<VisualAsset> {
  const res = await fetch('/api/assets/' + encodeURIComponent(id))
  if (!res.ok) throw new Error('素材不存在')
  return (await res.json()) as VisualAsset
}

export async function createAsset(input: CreateAssetInput): Promise<VisualAsset> {
  const res = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let errs: string[] = []
    try {
      errs = (await res.json()).errors || []
    } catch {
      /* ignore */
    }
    throw new Error('创建失败：' + (errs.join('；') || String(res.status)))
  }
  return (await res.json()) as VisualAsset
}

export async function updateAsset(id: string, patch: Partial<CreateAssetInput>): Promise<VisualAsset> {
  const res = await fetch('/api/assets/' + encodeURIComponent(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    let errs: string[] = []
    try {
      errs = (await res.json()).errors || []
    } catch {
      /* ignore */
    }
    throw new Error('更新失败：' + (errs.join('；') || String(res.status)))
  }
  return (await res.json()) as VisualAsset
}

export async function archiveAsset(id: string): Promise<VisualAsset> {
  const res = await fetch('/api/assets/' + encodeURIComponent(id), { method: 'DELETE' })
  if (!res.ok) throw new Error('归档失败')
  return (await res.json()) as VisualAsset
}

export async function restoreAsset(id: string): Promise<VisualAsset> {
  const res = await fetch('/api/assets/' + encodeURIComponent(id) + '/restore', { method: 'POST' })
  if (!res.ok) throw new Error('恢复失败')
  return (await res.json()) as VisualAsset
}

export async function buildReferenceSelection(
  assetIds: string[],
  roleMap: Record<string, string>,
): Promise<ReferenceSelection> {
  const res = await fetch('/api/assets/build-reference-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_ids: assetIds, role_map: roleMap }),
  })
  if (!res.ok) throw new Error('构建参考选择失败')
  return (await res.json()) as ReferenceSelection
}
