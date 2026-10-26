// 豆包 Seedream 图像生成适配器（服务端专用）
// 仅服务端调用火山方舟 /api/v3/images/generations；密钥不进前端、不进日志。
// 未配置密钥时返回结构化 not_configured；可经 GENERATION_MOCK=1 进入本地占位模式（用于开发/测试）。

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const GENERATED_DIR = join(ROOT, 'assets', 'generated')

// 各已知 Seedream 版本的输入约束（仅记录已核实项；缺失项交由运行时校验）。
// 参考图数量上限：5.0 lite 14 张，其余 10 张；默认保守按 10。
export const MODEL_PARAMS = {
  'doubao-seedream-5-0-pro-260628': { max_refs: 10, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K'] },
  'doubao-seedream-5-0-flash-260915': { max_refs: 10, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K'] },
  'doubao-seedream-5-0-260128': { max_refs: 14, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K'] },
  'doubao-seedream-5-0-lite-260128': { max_refs: 14, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K'] },
  'doubao-seedream-4-5-251128': { max_refs: 10, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K', '4K'] },
  'doubao-seedream-4-0-250828': { max_refs: 10, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K', '4K'] },
}

const DEFAULT_PARAMS = { max_refs: 10, size_default: '2048x2048', sizes: ['1K', '1.5K', '2K'] }

export function isConfigured() {
  return !!process.env.ARK_API_KEY
}

export function getModelId() {
  return process.env.ARK_IMAGE_MODEL_ID || null
}

export function isMock() {
  return process.env.GENERATION_MOCK === '1'
}

export function getModelParams(modelId) {
  return MODEL_PARAMS[modelId] || DEFAULT_PARAMS
}

/** 规范化上游 / 网络错误为结构化错误（绝不暴露密钥/敏感头/堆栈） */
function normalizeError(err, status) {
  if (status === 401 || status === 403) return { code: 'auth_failed', message: '图像生成授权失败，请检查服务端配置。' }
  if (status === 400) return { code: 'unsupported_param', message: '请求参数不被该模型支持。' }
  if (status === 429) return { code: 'rate_limited', message: '图像服务调用过于频繁或额度受限，请稍后再试。' }
  if (status === 402) return { code: 'quota_exceeded', message: '图像服务额度/余额不足。' }
  if (status && status >= 500) return { code: 'upstream_failed', message: '图像生成服务暂时不可用。' }
  const msg = String(err?.message || err || '').slice(0, 120)
  if (/timeout/i.test(msg)) return { code: 'timeout', message: '图像生成超时，请重试。' }
  if (/fetch failed|network|ENOTFOUND|ECONN/i.test(msg)) return { code: 'network', message: '无法连接图像生成服务。' }
  return { code: 'upstream_failed', message: '图像生成失败，请重试。' }
}

/**
 * 生成图像。
 * @param {{prompt:string, imageRefs?:string[], size?:string, responseFormat?:string}} args
 *   imageRefs：已编码的参考图（URL 或 data URI），由调用方在传入前完成本地文件编码。
 * @returns {Promise<{ok:boolean, code?:string, message?:string, image_url?:string|null, local_path?:string, mock?:boolean}>}
 */
export async function generateImage(args) {
  const prompt = (args.prompt || '').trim()
  if (!prompt) return { ok: false, code: 'invalid_prompt', message: '缺少生成提示词。' }

  // 本地占位模式（开发/测试）：不调用任何外部 API，写入占位图并持久化。
  if (isMock()) {
    const path = writeMockImage(args.prompt)
    return { ok: true, image_url: null, local_path: path, mock: true }
  }

  if (!isConfigured()) {
    return { ok: false, code: 'not_configured', message: '图像生成服务尚未配置（缺少 ARK_API_KEY）。' }
  }

  const model = getModelId()
  if (!model) {
    return { ok: false, code: 'model_unknown', message: '未配置图像模型 ID（ARK_IMAGE_MODEL_ID）。' }
  }
  const params = getModelParams(model)
  const imageRefs = Array.isArray(args.imageRefs) ? args.imageRefs : []
  if (imageRefs.length > params.max_refs) {
    return { ok: false, code: 'too_many_refs', message: `参考图数量超过模型上限（${params.max_refs}）。` }
  }

  const endpoint = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
  const body = {
    model,
    prompt,
    size: args.size || params.size_default,
    response_format: args.responseFormat || 'url',
  }
  if (imageRefs.length) body.image = imageRefs

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ARK_API_KEY}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const e = normalizeError(null, res.status)
      return { ok: false, code: e.code, message: e.message }
    }
    const data = await res.json().catch(() => null)
    const imageUrl =
      data?.data?.image_urls?.[0] ||
      data?.data?.image_url ||
      (Array.isArray(data?.data) ? data.data[0]?.url : null) ||
      (Array.isArray(data?.images) ? data.images[0]?.url : null)
    if (!imageUrl) return { ok: false, code: 'invalid_response', message: '生成结果缺少图像数据。' }
    return { ok: true, image_url: imageUrl }
  } catch (err) {
    const e = normalizeError(err)
    return { ok: false, code: e.code, message: e.message }
  } finally {
    clearTimeout(timeout)
  }
}

/** 下载远程图片字节（用于把临时 URL 持久化为本地文件，避免 24h 失效）。 */
export async function downloadImageBytes(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error('download_failed')
    const buf = Buffer.from(await res.arrayBuffer())
    return buf
  } finally {
    clearTimeout(timeout)
  }
}

function writeMockImage(promptText) {
  if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true })
  const id = `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const safe = String(promptText).slice(0, 60).replace(/[<>&]/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="g" cx="50%" cy="36%" r="75%">
      <stop offset="0%" stop-color="#0E5A57"/>
      <stop offset="55%" stop-color="#0d7885"/>
      <stop offset="100%" stop-color="#04222E"/>
    </radialGradient>
    <linearGradient id="l" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8EDBE4" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#8EDBE4" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <rect width="1024" height="1024" fill="url(#l)"/>
  <circle cx="512" cy="430" r="180" fill="#8EDBE4" opacity="0.06"/>
  <text x="512" y="540" font-family="PingFang SC, sans-serif" font-size="30" fill="#E8E7DF" opacity="0.8" text-anchor="middle">理想世界的预览占位</text>
  <text x="512" y="588" font-family="PingFang SC, sans-serif" font-size="20" fill="#B8C8D0" opacity="0.6" text-anchor="middle">未连接真实模型 · 仅开发/测试</text>
  <text x="512" y="700" font-family="PingFang SC, sans-serif" font-size="18" fill="#B8C8D0" opacity="0.45" text-anchor="middle">${safe}</text>
</svg>`
  const file = join(GENERATED_DIR, `${id}.svg`)
  writeFileSync(file, svg, 'utf8')
  return file
}

/** 将生成结果写入本地并返回对外服务的相对路径（例如 assets/generated/xxx.svg）。 */
export function persistBytes(buffer, ext = 'png') {
  if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true })
  const id = `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const file = join(GENERATED_DIR, `${id}.${ext}`)
  writeFileSync(file, buffer)
  return file
}

export { GENERATED_DIR }
