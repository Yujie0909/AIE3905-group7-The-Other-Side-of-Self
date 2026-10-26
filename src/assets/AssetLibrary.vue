<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  fetchMeta,
  fetchAssets,
  createAsset,
  updateAsset,
  archiveAsset,
  restoreAsset,
  buildReferenceSelection,
} from './api'
import type {
  VisualAsset,
  LibraryMeta,
  AssetFilters,
  AssetType,
  SourceType,
  LicenseStatus,
  ReferenceRole,
  ReferenceSelection,
} from './types'

interface AssetForm {
  title: string
  asset_type: AssetType
  source_type: SourceType
  license_status: LicenseStatus
  categories: string[]
  reference_roles: ReferenceRole[]
  caption: string
  source_uri: string
  thumbnail_uri: string
  scene_tags: string
  activity_tags: string
  visual_tags: string
  mood_tags: string
  license_notes: string
  quality_score: string
  benchmark_scene_ids: string[]
}

const meta = ref<LibraryMeta | null>(null)
const assets = ref<VisualAsset[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const toastMsg = ref<string>('')

const filters = ref<AssetFilters>({
  q: '',
  category: '',
  reference_role: '',
  license_status: '',
  review_status: '',
  tag: '',
  benchmark_scene_id: '',
  include_archived: false,
})

const selectedId = ref('')
const isNew = ref(false)
const form = ref<AssetForm | null>(null)
const selectedIds = ref<string[]>([])
const roleMap = ref<Record<string, string>>({})
const selectionResult = ref<ReferenceSelection | null>(null)

function showToast(m: string) {
  toastMsg.value = m
  window.setTimeout(() => {
    if (toastMsg.value === m) toastMsg.value = ''
  }, 2200)
}
function toArr(s: string): string[] {
  return s
    .split(/[,，、\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}
function catLabel(id: string): string {
  return meta.value?.categories.find((c) => c.id === id)?.label || id
}
function roleLabel(id: string): string {
  return meta.value?.reference_roles.find((r) => r.id === id)?.label || id
}

function emptyForm(): AssetForm {
  return {
    title: '',
    asset_type: 'image',
    source_type: 'original',
    license_status: 'pending',
    categories: [],
    reference_roles: ['scene'],
    caption: '',
    source_uri: '',
    thumbnail_uri: '',
    scene_tags: '',
    activity_tags: '',
    visual_tags: '',
    mood_tags: '',
    license_notes: '',
    quality_score: '',
    benchmark_scene_ids: [],
  }
}

function assetToForm(a: VisualAsset): AssetForm {
  return {
    title: a.title,
    asset_type: a.asset_type,
    source_type: a.source_type,
    license_status: a.license_status,
    categories: [...a.categories],
    reference_roles: [...a.reference_roles],
    caption: a.caption,
    source_uri: a.source_uri || '',
    thumbnail_uri: a.thumbnail_uri || '',
    scene_tags: a.scene_tags.join('，'),
    activity_tags: a.activity_tags.join('，'),
    visual_tags: a.visual_tags.join('，'),
    mood_tags: a.mood_tags.join('，'),
    license_notes: a.license_notes,
    quality_score: a.quality_score === null || a.quality_score === undefined ? '' : String(a.quality_score),
    benchmark_scene_ids: [...a.benchmark_scene_ids],
  }
}

function formToInput(f: AssetForm) {
  const qs = f.quality_score.trim()
  return {
    title: f.title.trim(),
    asset_type: f.asset_type,
    source_type: f.source_type,
    license_status: f.license_status,
    categories: f.categories,
    reference_roles: f.reference_roles,
    caption: f.caption,
    source_uri: f.source_uri.trim() || null,
    thumbnail_uri: f.thumbnail_uri.trim() || null,
    scene_tags: toArr(f.scene_tags),
    activity_tags: toArr(f.activity_tags),
    visual_tags: toArr(f.visual_tags),
    mood_tags: toArr(f.mood_tags),
    license_notes: f.license_notes,
    quality_score: qs === '' ? null : Number(qs),
    benchmark_scene_ids: f.benchmark_scene_ids,
  }
}

async function loadMeta() {
  meta.value = await fetchMeta()
}
async function loadAssets() {
  loading.value = true
  error.value = null
  try {
    assets.value = await fetchAssets(filters.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function openDetail(a: VisualAsset) {
  selectedId.value = a.asset_id
  isNew.value = false
  form.value = assetToForm(a)
  selectionResult.value = null
}
function newAsset() {
  selectedId.value = ''
  isNew.value = true
  form.value = emptyForm()
  selectionResult.value = null
}
function cancelEdit() {
  isNew.value = false
  form.value = null
  selectedId.value = ''
}

async function save() {
  if (!form.value) return
  error.value = null
  const payload = formToInput(form.value)
  if (!payload.title) {
    error.value = '标题不能为空'
    return
  }
  try {
    if (isNew.value) {
      const created = await createAsset(payload)
      showToast(`已创建 ${created.asset_id}`)
      isNew.value = false
      selectedId.value = created.asset_id
      form.value = assetToForm(created)
    } else {
      await updateAsset(selectedId.value, payload)
      showToast('已保存')
    }
    await loadAssets()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  }
}

async function doArchive() {
  if (!selectedId.value) return
  await archiveAsset(selectedId.value)
  showToast('已归档（软删除）')
  await loadAssets()
}
async function doRestore() {
  if (!selectedId.value) return
  await restoreAsset(selectedId.value)
  showToast('已恢复')
  await loadAssets()
}

function toggleSelect(a: VisualAsset) {
  const i = selectedIds.value.indexOf(a.asset_id)
  if (i >= 0) {
    selectedIds.value.splice(i, 1)
    delete roleMap.value[a.asset_id]
  } else {
    selectedIds.value.push(a.asset_id)
    roleMap.value[a.asset_id] = a.reference_roles[0] || 'scene'
  }
  // 触发响应
  selectedIds.value = [...selectedIds.value]
  roleMap.value = { ...roleMap.value }
}

async function buildSelection() {
  error.value = null
  if (!selectedIds.value.length) {
    error.value = '请先在网格中选择素材'
    return
  }
  try {
    selectionResult.value = await buildReferenceSelection(selectedIds.value, roleMap.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '构建失败'
  }
}

function placeholderStyle(a: VisualAsset) {
  let h = 0
  for (let i = 0; i < a.asset_id.length; i++) h = (h * 31 + a.asset_id.charCodeAt(i)) % 360
  const b1 = 180 + (h % 50)
  const b2 = 180 + ((h + 24) % 50)
  return { background: `linear-gradient(135deg, hsl(${b1} 42% 16%), hsl(${b2} 38% 30%))` }
}

const selectedAsset = computed(() => assets.value.find((a) => a.asset_id === selectedId.value) || null)

const roleGroups = computed(() => {
  if (!meta.value || !selectionResult.value) return []
  return meta.value.reference_roles.map((r) => ({
    id: r.id,
    label: r.label,
    items: selectionResult.value!.groups[r.id as ReferenceRole] || [],
  }))
})

let deb: number | undefined
watch(
  filters,
  () => {
    if (deb) clearTimeout(deb)
    deb = window.setTimeout(loadAssets, 300)
  },
  { deep: true },
)

onMounted(async () => {
  try {
    await loadMeta()
    await loadAssets()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '初始化失败'
  }
})
</script>

<template>
  <div class="al">
    <header class="al__head">
      <div>
        <h1>Visual Asset Library</h1>
        <p class="al__sub">《自我的彼岸》素材库 · 开发期管理界面 · 非展览入口</p>
      </div>
      <span class="al__badge">DEV · 不接入展览路由</span>
    </header>

    <div class="al__toolbar">
      <input v-model="filters.q" class="al__search" type="search" placeholder="搜索标题 / 描述…" />
      <select v-model="filters.category" class="al__sel">
        <option value="">全部分类</option>
        <option v-for="c in meta?.categories" :key="c.id" :value="c.id">{{ c.label }}</option>
      </select>
      <select v-model="filters.reference_role" class="al__sel">
        <option value="">全部参考用途</option>
        <option v-for="r in meta?.reference_roles" :key="r.id" :value="r.id">{{ r.label }}</option>
      </select>
      <select v-model="filters.license_status" class="al__sel">
        <option value="">全部授权状态</option>
        <option v-for="l in meta?.license_statuses" :key="l" :value="l">{{ l }}</option>
      </select>
      <select v-model="filters.review_status" class="al__sel">
        <option value="">全部复核状态</option>
        <option value="draft">待审核草稿</option>
        <option value="approved">已确认</option>
      </select>
      <select v-model="filters.benchmark_scene_id" class="al__sel">
        <option value="">全部基准场景</option>
        <option v-for="s in meta?.benchmark_scenes" :key="s.scene_id" :value="s.scene_id">{{ s.scene_id }} · {{ s.title }}</option>
      </select>
      <label class="al__chk"><input type="checkbox" v-model="filters.include_archived" /> 含已归档</label>
      <button class="al__btn" type="button" @click="loadAssets">刷新</button>
      <button class="al__btn al__btn--primary" type="button" @click="newAsset">+ 新增素材</button>
    </div>

    <p v-if="error" class="al__error">{{ error }}</p>

    <div class="al__body">
      <!-- 网格 -->
      <section class="al__grid-wrap">
        <p v-if="loading" class="al__hint">加载中…</p>
        <p v-else-if="!assets.length" class="al__hint">无匹配素材。</p>
        <div v-else class="al__grid">
          <article
            v-for="a in assets"
            :key="a.asset_id"
            class="al__card"
            :class="{ sel: selectedIds.includes(a.asset_id), active: a.asset_id === selectedId }"
            @click="openDetail(a)"
          >
            <div class="al__thumb" :style="placeholderStyle(a)">
              <span class="al__demo">DEMO 占位</span>
              <span class="al__type">{{ a.asset_type }}</span>
              <input
                class="al__pick"
                type="checkbox"
                :checked="selectedIds.includes(a.asset_id)"
                @click.stop="toggleSelect(a)"
                title="选择进入生成参考"
              />
            </div>
            <div class="al__card-body">
              <div class="al__card-top">
                <h3>{{ a.title }}</h3>
                <span v-if="a.review_status === 'draft'" class="al__arch al__arch--draft">AI 草稿</span>
                <span v-if="a.archived" class="al__arch">已归档</span>
              </div>
              <div class="al__chips">
                <span class="al__chip" :class="'lic-' + a.license_status">{{ a.license_status }}</span>
                <span v-for="c in a.categories" :key="c" class="al__chip cat">{{ catLabel(c) }}</span>
              </div>
              <div class="al__chips">
                <span v-for="r in a.reference_roles" :key="r" class="al__chip role">{{ roleLabel(r) }}</span>
              </div>
              <p v-if="a.file_status === 'missing'" class="al__warn">源文件未入库（DEMO）</p>
            </div>
          </article>
        </div>
      </section>

      <!-- 详情 / 编辑 / 生成预览 -->
      <aside class="al__side">
        <div v-if="form" class="al__panel">
          <h2>{{ isNew ? '新增素材' : '编辑 · ' + selectedId }}</h2>
          <label class="al__lbl">标题 *</label>
          <input v-model="form.title" class="al__inp" />

          <div class="al__row">
            <div>
              <label class="al__lbl">类型</label>
              <select v-model="form.asset_type" class="al__inp">
                <option v-for="t in meta?.asset_types" :key="t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div>
              <label class="al__lbl">来源</label>
              <select v-model="form.source_type" class="al__inp">
                <option v-for="s in meta?.source_types" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div>
              <label class="al__lbl">授权</label>
              <select v-model="form.license_status" class="al__inp">
                <option v-for="l in meta?.license_statuses" :key="l" :value="l">{{ l }}</option>
              </select>
            </div>
          </div>

          <label class="al__lbl">描述（画面说明）</label>
          <textarea v-model="form.caption" class="al__inp al__ta" rows="2"></textarea>

          <label class="al__lbl">分类（可多选）</label>
          <div class="al__checks">
            <label v-for="c in meta?.categories" :key="c.id" class="al__chk">
              <input type="checkbox" :value="c.id" v-model="form.categories" /> {{ c.label }}
            </label>
          </div>

          <label class="al__lbl">参考用途（可多选）</label>
          <div class="al__checks">
            <label v-for="r in meta?.reference_roles" :key="r.id" class="al__chk">
              <input type="checkbox" :value="r.id" v-model="form.reference_roles" /> {{ r.label }}
            </label>
          </div>

          <label class="al__lbl">标签（逗号分隔）：场景 / 活动 / 视觉 / 氛围</label>
          <input v-model="form.scene_tags" class="al__inp" placeholder="如：海边，海岸线" />
          <input v-model="form.activity_tags" class="al__inp" placeholder="如：听海，独处" />
          <input v-model="form.visual_tags" class="al__inp" placeholder="如：深海蓝，柔光" />
          <input v-model="form.mood_tags" class="al__inp" placeholder="如：安静，自由" />

          <label class="al__lbl">关联基准场景（B01–B24）</label>
          <div class="al__checks al__checks--wrap">
            <label v-for="s in meta?.benchmark_scenes" :key="s.scene_id" class="al__chk">
              <input type="checkbox" :value="s.scene_id" v-model="form.benchmark_scene_ids" /> {{ s.scene_id }}
            </label>
          </div>

          <div class="al__row">
            <div>
              <label class="al__lbl">质量评分（可空）</label>
              <input v-model="form.quality_score" class="al__inp" type="number" step="0.1" min="0" max="5" />
            </div>
            <div>
              <label class="al__lbl">源文件 URI</label>
              <input v-model="form.source_uri" class="al__inp" placeholder="assets/original/xxx.jpg" />
            </div>
          </div>

          <label class="al__lbl">授权说明</label>
          <textarea v-model="form.license_notes" class="al__inp al__ta" rows="2"></textarea>

          <div class="al__actions">
            <button class="al__btn al__btn--primary" type="button" @click="save">保存</button>
            <button v-if="!isNew" class="al__btn" type="button" @click="doArchive">归档</button>
            <button v-if="!isNew && selectedAsset?.archived" class="al__btn" type="button" @click="doRestore">恢复</button>
            <button class="al__btn" type="button" @click="cancelEdit">取消</button>
          </div>
        </div>
        <div v-else class="al__panel al__empty">从左侧网格选择素材查看与编辑，或点击「新增素材」。</div>

        <!-- 生成参考选择预览 -->
        <div class="al__panel al__gen">
          <h2>生成参考选择预览</h2>
          <p class="al__hint">已选 {{ selectedIds.length }} 个素材。</p>
          <ul v-if="selectedIds.length" class="al__sel-list">
            <li v-for="id in selectedIds" :key="id">
              <span class="al__sel-id">{{ id }}</span>
              <select v-model="roleMap[id]" class="al__mini">
                <option v-for="r in meta?.reference_roles" :key="r.id" :value="r.id">{{ roleLabel(r.id) }}</option>
              </select>
            </li>
          </ul>
          <button class="al__btn al__btn--primary" type="button" @click="buildSelection">构建参考选择</button>

          <div v-if="selectionResult" class="al__result">
            <p class="al__note">{{ selectionResult.note }}</p>
            <div v-for="r in roleGroups" :key="r.id" class="al__grp">
              <h3>{{ r.label }}</h3>
              <p v-if="!r.items.length" class="al__hint">—</p>
              <ul v-else>
                <li v-for="g in r.items" :key="g.asset_id">
                  <span :class="g.usable ? 'ok' : 'bad'">{{ g.usable ? '可用' : '排除' }}</span>
                  {{ g.asset_id }} · {{ g.title }}
                  <em v-if="g.reason">（{{ g.reason }}）</em>
                </li>
              </ul>
            </div>
            <p v-if="selectionResult.invalid.length" class="al__warn">
              无效 ID：{{ selectionResult.invalid.map((x) => x.asset_id + '(' + x.reason + ')').join('，') }}
            </p>
          </div>
        </div>
      </aside>
    </div>

    <div v-if="toastMsg" class="al__toast">{{ toastMsg }}</div>
  </div>
</template>

<style scoped>
.al {
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.4rem clamp(1rem, 4vw, 3rem) 3rem;
  color: #e8eef0;
  font-family: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.al__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(142, 219, 228, 0.2);
  padding-bottom: 1rem;
}
.al__head h1 {
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: 0.04em;
}
.al__sub {
  margin: 0.3rem 0 0;
  font-size: 0.85rem;
  color: rgba(184, 200, 208, 0.7);
}
.al__badge {
  flex: none;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: #04222e;
  background: #8edbe4;
  padding: 0.35em 0.7em;
  border-radius: 999px;
}
.al__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin: 1rem 0;
}
.al__search {
  flex: 1 1 220px;
  min-width: 180px;
  background: rgba(4, 34, 46, 0.6);
  color: #e8eef0;
  border: 1px solid rgba(142, 219, 228, 0.3);
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
}
.al__sel,
.al__inp,
.al__mini {
  background: rgba(4, 34, 46, 0.6);
  color: #e8eef0;
  border: 1px solid rgba(142, 219, 228, 0.3);
  border-radius: 10px;
  padding: 0.5rem 0.6rem;
  font-size: 0.85rem;
}
.al__chk {
  font-size: 0.82rem;
  color: rgba(184, 200, 208, 0.85);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.al__btn {
  background: rgba(142, 219, 228, 0.12);
  color: #e8eef0;
  border: 1px solid rgba(142, 219, 228, 0.4);
  border-radius: 999px;
  padding: 0.5em 1em;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 300ms ease;
}
.al__btn:hover {
  background: rgba(142, 219, 228, 0.22);
}
.al__btn--primary {
  background: linear-gradient(180deg, #b8ecf2, #8edbe4);
  color: #04222e;
  font-weight: 600;
  border-color: rgba(226, 248, 250, 0.6);
}
.al__error {
  color: rgba(240, 180, 180, 0.95);
  font-size: 0.88rem;
}
.al__body {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 1.2rem;
  align-items: start;
}
@media (max-width: 980px) {
  .al__body {
    grid-template-columns: 1fr;
  }
}
.al__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.9rem;
}
.al__card {
  background: rgba(14, 90, 87, 0.12);
  border: 1px solid rgba(142, 219, 228, 0.18);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 300ms ease, transform 200ms ease;
}
.al__card:hover {
  border-color: rgba(142, 219, 228, 0.45);
}
.al__card.sel {
  border-color: #8edbe4;
}
.al__card.active {
  box-shadow: 0 0 0 2px rgba(142, 219, 228, 0.5);
}
.al__thumb {
  position: relative;
  height: 110px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0.4rem 0.5rem;
}
.al__demo {
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: rgba(244, 239, 230, 0.7);
  background: rgba(4, 34, 46, 0.55);
  padding: 0.15em 0.5em;
  border-radius: 6px;
}
.al__type {
  font-size: 0.65rem;
  color: rgba(142, 219, 228, 0.85);
}
.al__pick {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
}
.al__card-body {
  padding: 0.6rem 0.7rem 0.7rem;
}
.al__card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}
.al__card-top h3 {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.3;
}
.al__arch {
  font-size: 0.62rem;
  color: rgba(213, 198, 160, 0.9);
}
.al__arch--draft {
  color: rgba(120, 200, 230, 0.95);
  border: 1px solid rgba(120, 200, 230, 0.4);
  border-radius: 3px;
  padding: 1px 5px;
}
.al__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.4rem;
}
.al__chip {
  font-size: 0.66rem;
  padding: 0.12em 0.5em;
  border-radius: 999px;
  background: rgba(142, 219, 228, 0.14);
  color: rgba(200, 230, 235, 0.9);
}
.al__chip.cat {
  background: rgba(14, 90, 87, 0.35);
}
.al__chip.role {
  background: rgba(244, 239, 230, 0.12);
}
.al__chip.lic-approved {
  background: rgba(120, 200, 160, 0.25);
  color: #aef0c8;
}
.al__chip.lic-pending {
  background: rgba(213, 198, 160, 0.22);
  color: #e6dca8;
}
.al__chip.lic-restricted {
  background: rgba(213, 160, 120, 0.22);
  color: #e6b98a;
}
.al__chip.lic-rejected {
  background: rgba(213, 160, 160, 0.22);
  color: #f0b4b4;
}
.al__warn {
  font-size: 0.72rem;
  color: rgba(213, 198, 160, 0.9);
  margin: 0.4rem 0 0;
}
.al__side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1rem;
}
.al__panel {
  background: rgba(14, 90, 87, 0.1);
  border: 1px solid rgba(142, 219, 228, 0.18);
  border-radius: 12px;
  padding: 1rem;
}
.al__empty {
  color: rgba(184, 200, 208, 0.7);
  font-size: 0.9rem;
}
.al__panel h2 {
  margin: 0 0 0.7rem;
  font-size: 1.05rem;
}
.al__lbl {
  display: block;
  font-size: 0.78rem;
  color: rgba(184, 200, 208, 0.85);
  margin: 0.6rem 0 0.25rem;
}
.al__inp {
  width: 100%;
  box-sizing: border-box;
}
.al__ta {
  resize: vertical;
}
.al__row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}
.al__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.8rem;
}
.al__checks--wrap .al__chk {
  min-width: 64px;
}
.al__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.9rem;
}
.al__gen h2 {
  margin-top: 0;
}
.al__sel-list {
  list-style: none;
  padding: 0;
  margin: 0.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.al__sel-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
}
.al__sel-id {
  font-family: monospace;
  color: rgba(142, 219, 228, 0.9);
}
.al__result {
  margin-top: 0.8rem;
  border-top: 1px solid rgba(142, 219, 228, 0.18);
  padding-top: 0.7rem;
}
.al__note {
  font-size: 0.76rem;
  color: rgba(213, 198, 160, 0.9);
  background: rgba(213, 198, 160, 0.1);
  border-radius: 8px;
  padding: 0.5rem 0.6rem;
}
.al__grp {
  margin-top: 0.6rem;
}
.al__grp h3 {
  margin: 0 0 0.2rem;
  font-size: 0.85rem;
  color: rgba(142, 219, 228, 0.9);
}
.al__grp ul {
  margin: 0;
  padding-left: 1rem;
  font-size: 0.8rem;
}
.al__grp .ok {
  color: #aef0c8;
  font-weight: 600;
}
.al__grp .bad {
  color: #f0b4b4;
  font-weight: 600;
}
.al__grp em {
  color: rgba(184, 200, 208, 0.7);
  font-style: normal;
  font-size: 0.74rem;
}
.al__hint {
  font-size: 0.85rem;
  color: rgba(184, 200, 208, 0.6);
}
.al__toast {
  position: fixed;
  bottom: 1.2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(4, 34, 46, 0.92);
  border: 1px solid rgba(142, 219, 228, 0.4);
  color: #e8eef0;
  padding: 0.6rem 1.1rem;
  border-radius: 999px;
  font-size: 0.85rem;
}
</style>
