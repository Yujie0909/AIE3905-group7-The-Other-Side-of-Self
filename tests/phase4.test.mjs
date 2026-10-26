// Visual Asset Library MVP 验收脚本（独立运行，依赖运行中的后端 :8787）
// 运行：先启动后端（npm run server），再 node tests/phase4.test.mjs
// 覆盖：新增/查看/编辑/归档、搜索与筛选、未授权不进生成、ID 唯一、无效 ID 拒绝、
//       缺失文件提示、基准关联、持久化、Phase1/2 不受影响、启动正常、无密钥/隐私泄漏。

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const BASE = 'http://localhost:8787'

let pass = 0
let fail = 0
function check(name, cond, extra = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.error(`  ✗ ${name} ${extra}`)
  }
}
function uniq(arr) {
  return new Set(arr).size === arr.length
}

async function api(method, path, body) {
  const opt = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opt.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opt)
  let data = null
  try {
    data = await res.json()
  } catch {
    /* ignore */
  }
  return { status: res.status, data }
}

console.log('\n[1] 元数据与种子加载')
const meta = await api('GET', '/api/assets/meta')
check('meta 接口 200', meta.status === 200)
check('分类数为 9', meta.data?.categories?.length === 9, `实际 ${meta.data?.categories?.length}`)
check('参考用途数为 6（v1.1 扩展 lighting/material）', meta.data?.reference_roles?.length === 6)
check('基准场景数为 24', meta.data?.benchmark_scenes?.length === 24)

const list = await api('GET', '/api/assets')
check('素材列表 200', list.status === 200)
const assets = list.data?.assets || []
check('种子素材数量 ≥ 50', assets.length >= 50, `实际 ${assets.length}`)
check('每个素材 asset_id 唯一', uniq(assets.map((a) => a.asset_id)))
check('种子中无已归档项（默认列表不含归档）', assets.every((a) => !a.archived))

console.log('\n[2] 搜索与分类/授权筛选')
const byCat = await api('GET', '/api/assets?category=home_private')
check('按分类筛选：结果均属于该分类', (byCat.data?.assets || []).every((a) => a.categories.includes('home_private')))
const byLic = await api('GET', '/api/assets?license_status=approved')
check('按授权筛选：结果均为 approved', (byLic.data?.assets || []).every((a) => a.license_status === 'approved'))
const byQ = await api('GET', '/api/assets?q=' + encodeURIComponent('海岸'))
check('关键词搜索"海岸"命中标题或描述', (byQ.data?.assets || []).length > 0)
const byScene = await api('GET', '/api/assets?benchmark_scene_id=B01')
check('按基准场景 B01 筛选命中', (byScene.data?.assets || []).every((a) => a.benchmark_scene_ids.includes('B01')))

console.log('\n[3] 新增 / 查看 / 编辑 / 归档')
const createR = await api('POST', '/api/assets', {
  title: '测试素材-海岸新晨',
  asset_type: 'image',
  source_type: 'original',
  license_status: 'approved',
  categories: ['nature_freedom'],
  reference_roles: ['scene'],
  caption: '测试描述',
  benchmark_scene_ids: ['B01', 'B02'],
})
check('新增素材返回 201', createR.status === 201)
const newId = createR.data?.asset_id
check('新增素材有唯一 asset_id', typeof newId === 'string' && newId.startsWith('AST-'))
const getR = await api('GET', '/api/assets/' + newId)
check('查看素材 200', getR.status === 200 && getR.data?.title === '测试素材-海岸新晨')
const updR = await api('PUT', '/api/assets/' + newId, { title: '测试素材-已编辑', license_status: 'pending' })
check('编辑素材 200', updR.status === 200 && updR.data?.title === '测试素材-已编辑')
check('编辑后授权变更为 pending', updR.data?.license_status === 'pending')
const archR = await api('DELETE', '/api/assets/' + newId)
check('归档（软删除）200', archR.status === 200 && archR.data?.archived === true)
const listAfterArch = await api('GET', '/api/assets?include_archived=1')
check('含归档列表包含已归档项', (listAfterArch.data?.assets || []).some((a) => a.asset_id === newId))
const listDefault = await api('GET', '/api/assets')
check('默认列表排除已归档项', !(listDefault.data?.assets || []).some((a) => a.asset_id === newId))

console.log('\n[4] 无效素材 ID 正确拒绝')
const badGet = await api('GET', '/api/assets/DOES-NOT-EXIST')
check('无效 ID 查看返回 404', badGet.status === 404)
const badUpd = await api('PUT', '/api/assets/DOES-NOT-EXIST', { title: 'x' })
check('无效 ID 编辑返回 404', badUpd.status === 404)
const badSel = await api('POST', '/api/assets/build-reference-selection', { asset_ids: ['DOES-NOT-EXIST'] })
check('构建参考选择：无效 ID 进入 invalid', (badSel.data?.invalid || []).some((x) => x.asset_id === 'DOES-NOT-EXIST' && x.reason === 'not_found'))

console.log('\n[5] 未授权素材不默认进入正式生成参考')
const approved = assets.find((a) => a.license_status === 'approved')
const pending = assets.find((a) => a.license_status === 'pending' || a.license_status === 'restricted' || a.license_status === 'rejected')
const selIds = [approved?.asset_id, pending?.asset_id].filter(Boolean)
const buildR = await api('POST', '/api/assets/build-reference-selection', { asset_ids: selIds })
const allGroupItems = Object.values(buildR.data?.groups || {}).flat()
const approvedItem = allGroupItems.find((x) => x.asset_id === approved?.asset_id)
const pendingItem = allGroupItems.find((x) => x.asset_id === pending?.asset_id)
check('approved 素材标记 usable=true', approvedItem?.usable === true)
check('未授权素材标记 usable=false（被排除）', pendingItem?.usable === false)
const valR = await api('GET', '/api/assets/' + pending?.asset_id + '/validate')
check('validateAssetForGeneration 对未授权返回 valid=false', valR.data?.valid === false)

console.log('\n[6] 缺失文件有可理解提示')
const missingR = await api('GET', '/api/assets/' + approved?.asset_id)
check('素材返回 file_status 字段', 'file_status' in (missingR.data || {}))
check('种子素材源文件均为 missing（未入库，DEMO）', assets.every((a) => a.file_status === 'missing'))

console.log('\n[7] 基准场景关联可保存与读取')
const relGet = await api('GET', '/api/assets?benchmark_scene_id=B02')
check('关联 B02 的素材可被筛选读取', (relGet.data?.assets || []).length >= 1)

console.log('\n[8] 持久化（刷新后数据仍在）')
const dataFile = join(ROOT, 'server/data/assets.json')
let persisted = false
try {
  const onDisk = JSON.parse(readFileSync(dataFile, 'utf8'))
  persisted = onDisk.some((a) => a.asset_id === newId && a.title === '测试素材-已编辑')
} catch {
  persisted = false
}
check('编辑后的素材已写入服务端 JSON 文件（刷新仍在）', persisted)

console.log('\n[9] 现有第一/二阶段不受影响')
const serverSrc = readFileSync(join(ROOT, 'server/index.mjs'), 'utf8')
check('后端保留 /api/imagine/conversation', serverSrc.includes("'/api/imagine/conversation'"))
check('后端保留 /api/world-brief/assemble', serverSrc.includes("'/api/world-brief/assemble'"))
check('后端新增 /api/assets 路由', serverSrc.includes("'/api/assets'"))
check('App.vue 仍在 Observe/Imagine 间切换', readFileSync(join(ROOT, 'src/App.vue'), 'utf8').includes("type Phase = 'observe' | 'imagine'"))

console.log('\n[10] 无密钥 / 隐私泄漏')
const leakRe = /sk-[A-Za-z0-9]{12,}|or-v1-[A-Za-z0-9]{12,}/
check('meta 响应不含密钥字符串', !leakRe.test(JSON.stringify(meta.data || {})))
check('新增响应不含密钥字符串', !leakRe.test(JSON.stringify(createR.data || {})))
check('server 源码未直接打印 API Key', !/console\.(log|warn|error)\s*\(\s*process\.env\.(DEEPSEEK_API_KEY|OPENROUTER)/.test(serverSrc))

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
