import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL(".", import.meta.url))
const PORT = Number(process.env.PORT || 8899)
const BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")
const API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || ""
const TEXT_MODEL = process.env.TEXT_MODEL || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"
const VISION_MODEL = process.env.VISION_MODEL || process.env.OPENAI_VISION_MODEL || TEXT_MODEL
const WORKFLOW_MODEL = process.env.WORKFLOW_MODEL || TEXT_MODEL
const PROVIDER_HINT = `${BASE_URL} ${VISION_MODEL}`.toLowerCase()
const SUPPORTS_IMAGE_INPUT = process.env.ENABLE_IMAGE_INPUT
  ? process.env.ENABLE_IMAGE_INPUT === "true"
  : !PROVIDER_HINT.includes("deepseek")

const SEMANTIC_TYPES = ["design_goal", "culture_meaning", "personality", "shape_preference", "style_preference", "use_case", "negative_constraint", "conflict_signal"]
const ROLE_WEIGHT = { "政府/运营方": .9, "品牌策划": .9, "文化研究者": .85, "非遗代表": .85, "商户": .8, "村民": .75, "游客": .65, "未知": .6 }
const mime = { ".html": "text/html;charset=utf-8", ".css": "text/css;charset=utf-8", ".js": "text/javascript;charset=utf-8", ".md": "text/markdown;charset=utf-8", ".json": "application/json;charset=utf-8" }

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`)
    if (req.method === "GET" && url.pathname === "/api/model/status") return json(res, modelStatus())
    if (req.method === "POST" && url.pathname === "/api/workflow/analyze") {
      if (!API_KEY) return json(res, { error: "模型服务未配置：请设置 OPENAI_API_KEY 或 LLM_API_KEY 后重启服务。" }, 400)
      const body = await readJson(req)
      const result = await analyzeWorkflow(body)
      return json(res, result)
    }
    await serveStatic(url.pathname, res)
  } catch (error) {
    console.error(error)
    return json(res, { error: error.message || "服务异常", current_node: error.current_node || "unknown" }, error.statusCode || 500)
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Traceable Prompt Workflow server: http://127.0.0.1:${PORT}`)
  console.log(`Model endpoint: ${BASE_URL}, text=${TEXT_MODEL}, vision=${VISION_MODEL}`)
})

function modelStatus() {
  return { configured: Boolean(API_KEY), base_url: BASE_URL, text_model: TEXT_MODEL, vision_model: VISION_MODEL, workflow_model: WORKFLOW_MODEL, supports_image_input: SUPPORTS_IMAGE_INPUT }
}

async function serveStatic(pathname, res) {
  if (!["/", "/index.html", "/app.js", "/styles.css"].includes(pathname)) {
    res.writeHead(404); res.end("Not found"); return
  }
  const safe = normalize(pathname === "/" ? "/index.html" : pathname).replace(/^\.\.(\/|\\|$)/, "")
  const file = join(ROOT, safe)
  try {
    const data = await readFile(file)
    res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" })
    res.end(data)
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404, { "content-type": "text/plain;charset=utf-8" })
      res.end("Not found")
      return
    }
    throw error
  }
}

function json(res, data, status = 200) {
  res.writeHead(status, { "content-type": "application/json;charset=utf-8" })
  res.end(JSON.stringify(data))
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
}

async function analyzeWorkflow(raw) {
  const runStep = async (current_node, fn) => {
    try {
      return await fn()
    } catch (error) {
      error.current_node = current_node
      throw error
    }
  }

  const task = await runStep("input_preprocess", async () => node1(raw))
  const semanticResults = await runStep("text_semantic_extraction", async () => Promise.all(task.texts.map((text, index) => extractTextSemantics(text, index))))
  const semantic_units = semanticResults.flatMap((result) => result.semantic_units || []).map((unit, index) => normalizeSemantic(unit, index))
  const visual_units = await runStep("image_visual_extraction", async () => Promise.all(task.images.map((image) => extractImageVisuals(image))))
  const semantic_image_links = await runStep("multimodal_linking", async () => linkSemanticsAndImages(semantic_units, visual_units))
  const clusters = await runStep("cluster_weighting", async () => clusterAndWeight(semantic_units, semantic_image_links))
  const conflicts = await runStep("conflict_detection", async () => detectConflicts(clusters, semantic_units))
  const design_translations = await runStep("design_translation", async () => translateDesign(clusters, conflicts, visual_units, semantic_image_links))
  const final = await runStep("final_output", async () => generateOutputs(task, semantic_units, visual_units, semantic_image_links, clusters, conflicts, design_translations))
  return { task, semantic_units, visual_units, semantic_image_links, clusters, conflicts, design_translations, ...final }
}

function node1(raw) {
  const meta = raw.task_meta || {}
  const texts = (raw.texts || []).map((text, index) => ({
    source_id: text.source_id || `T${String(index + 1).padStart(3, "0")}`,
    speaker_name: clean(text.speaker_name) || "未知参与者",
    speaker_role: clean(text.speaker_role) || "未知",
    content: clean(text.content),
    related_images: Array.isArray(text.related_images) ? text.related_images : [],
    importance: ["low", "normal", "high"].includes(text.importance) ? text.importance : "normal",
  })).filter((text) => text.content)
  const images = (raw.images || []).map((image, index) => ({
    image_id: image.image_id || `IMG${String(index + 1).padStart(3, "0")}`,
    file_url: image.file_url || "",
    image_type: image.image_type || "other",
    image_name: clean(image.image_name) || `图片素材 ${index + 1}`,
    description: clean(image.description),
    related_culture: clean(image.related_culture),
  })).filter((image) => image.file_url || image.description || image.image_name)
  if (!texts.length && !images.length) throw new Error("请至少上传一条文字或一张图片")
  return {
    task_meta: {
      project_name: clean(meta.project_name) || "未命名项目",
      design_target: clean(meta.design_target) || "IP形象",
      location: clean(meta.location) || "",
      use_case: Array.isArray(meta.use_case) ? meta.use_case : [],
      style_preference: Array.isArray(meta.style_preference) ? meta.style_preference : [],
    },
    texts,
    images,
  }
}

async function extractTextSemantics(text, index) {
  const prompt = `你是一个“文化设计语义提取助手”。请从输入文本中提取与IP形象设计相关的语义信息，并输出结构化JSON。
要求：
1. 不要输出大段总结；
2. 必须拆成多个语义单元；
3. 每个语义单元必须保留原话证据 raw_quote；
4. semantic_type 只能从以下类型中选择：${SEMANTIC_TYPES.join("、")};
5. extracted_meaning 用简洁中文概括原话含义；
6. design_implication 必须说明这句话对后续IP设计意味着什么；
7. confidence 为0-1之间的小数。

输入信息：
source_id: ${text.source_id}
speaker_name: ${text.speaker_name}
speaker_role: ${text.speaker_role}
content: ${text.content}

请只输出JSON：
{"source_id":"","speaker_name":"","speaker_role":"","semantic_units":[{"semantic_id":"","semantic_type":"","raw_quote":"","extracted_meaning":"","design_implication":"","confidence":0.0}]}`
  const data = await callJson(TEXT_MODEL, [{ role: "user", content: prompt }])
  return {
    source_id: text.source_id,
    speaker_name: text.speaker_name,
    speaker_role: text.speaker_role,
    semantic_units: (data.semantic_units || []).map((unit, unitIndex) => ({
      ...unit,
      semantic_id: unit.semantic_id || `S${String(index + 1).padStart(3, "0")}_${unitIndex + 1}`,
      source_id: text.source_id,
      speaker_name: text.speaker_name,
      speaker_role: text.speaker_role,
    })),
  }
}

function normalizeSemantic(unit, index) {
  return {
    semantic_id: `S${String(index + 1).padStart(3, "0")}`,
    source_id: unit.source_id || "T_UNKNOWN",
    speaker_name: unit.speaker_name || "未知参与者",
    speaker_role: unit.speaker_role || "未知",
    semantic_type: SEMANTIC_TYPES.includes(unit.semantic_type) ? unit.semantic_type : "design_goal",
    raw_quote: clean(unit.raw_quote),
    extracted_meaning: clean(unit.extracted_meaning),
    design_implication: clean(unit.design_implication),
    confidence: clamp(Number(unit.confidence) || .75),
  }
}

async function extractImageVisuals(image) {
  const text = `image_id: ${image.image_id}\nimage_type: ${image.image_type}\nimage_name: ${image.image_name}\ndescription: ${image.description}\nrelated_culture: ${image.related_culture}`
  const prompt = `你是一个“文化视觉元素提取助手”。请分析输入图片，并提取适用于IP形象设计的视觉元素。不要只做图片描述，而要从设计转译角度分析图片。
请输出JSON：{"image_id":"","visual_objects":[],"shape_features":[],"color_palette":[],"material_features":[],"symbolic_elements":[],"emotional_keywords":[],"design_translation":[{"target_part":"","translation":"","confidence":0.0}]}
设计转译部位可包括：头部轮廓、身体轮廓、胸前纹样、翅膀纹样、色彩系统、配饰、背景图形、周边图案。

图片元信息：\n${text}`
  const content = [{ type: "text", text: prompt }]
  if (SUPPORTS_IMAGE_INPUT && image.file_url?.startsWith("data:image/")) content.push({ type: "image_url", image_url: { url: image.file_url } })
  const messageContent = SUPPORTS_IMAGE_INPUT ? content : prompt
  const data = await callJson(VISION_MODEL, [{ role: "user", content: messageContent }])
  return {
    image_id: image.image_id,
    image_name: image.image_name,
    file_url: image.file_url,
    image_type: image.image_type,
    description: image.description,
    visual_objects: array(data.visual_objects),
    shape_features: array(data.shape_features),
    color_palette: array(data.color_palette),
    material_features: array(data.material_features),
    symbolic_elements: array(data.symbolic_elements),
    emotional_keywords: array(data.emotional_keywords),
    design_translation: array(data.design_translation).map((item) => ({ target_part: clean(item.target_part), translation: clean(item.translation), confidence: clamp(Number(item.confidence) || .75) })),
  }
}

async function linkSemanticsAndImages(semanticUnits, visualUnits) {
  const candidates = []
  semanticUnits.forEach((semantic) => visualUnits.forEach((visual) => {
    if (roughMatch(semantic, visual)) candidates.push({ semantic, visual })
  }))
  const limited = candidates.slice(0, 32)
  const results = await Promise.all(limited.map(async ({ semantic, visual }, index) => {
    const prompt = `你是一个“多模态设计关联分析助手”。请判断文字语义和图片视觉元素之间是否存在设计关联。
relationship_type 只能是 supports、partial_support、no_relation。
请输出JSON：{"relationship_type":"supports|partial_support|no_relation","reason":"","design_use":""}

semantic_unit: ${JSON.stringify(semantic)}
visual_unit: ${JSON.stringify(visual)}`
    const data = await callJson(WORKFLOW_MODEL, [{ role: "user", content: prompt }])
    if (data.relationship_type === "no_relation") return null
    return { link_id: `L${String(index + 1).padStart(3, "0")}`, semantic_id: semantic.semantic_id, image_id: visual.image_id, relationship_type: ["supports", "partial_support"].includes(data.relationship_type) ? data.relationship_type : "partial_support", reason: clean(data.reason), design_use: clean(data.design_use) }
  }))
  return results.filter(Boolean)
}

function roughMatch(semantic, visual) {
  const text = `${semantic.raw_quote} ${semantic.extracted_meaning} ${semantic.design_implication}`
  const words = [...visual.visual_objects, ...visual.shape_features, ...visual.color_palette, ...visual.material_features, ...visual.symbolic_elements, ...visual.emotional_keywords].filter(Boolean)
  return words.some((word) => text.includes(String(word).slice(0, 2))) || semantic.semantic_type === "culture_meaning" || semantic.semantic_type === "style_preference"
}

async function clusterAndWeight(semanticUnits, links) {
  const prompt = `你是一个“语义聚类与设计方向命名助手”。请将语义单元聚类为设计方向，并计算重要性。
输出JSON：{"clusters":[{"cluster_id":"C001","cluster_name":"","included_semantics":[],"supporters":[],"opponents":[],"weight_score":0.0,"support_level":"low|medium|high","design_direction":""}]}
权重需要综合频次、角色权重、语义强度、与IP设计相关性、图片支撑。
角色权重：${JSON.stringify(ROLE_WEIGHT)}
semantic_units: ${JSON.stringify(semanticUnits)}
semantic_image_links: ${JSON.stringify(links)}`
  const data = await callJson(WORKFLOW_MODEL, [{ role: "user", content: prompt }])
  return array(data.clusters).map((cluster, index) => ({
    cluster_id: cluster.cluster_id || `C${String(index + 1).padStart(3, "0")}`,
    cluster_name: clean(cluster.cluster_name) || "综合设计方向",
    included_semantics: array(cluster.included_semantics),
    supporters: array(cluster.supporters),
    opponents: array(cluster.opponents),
    weight_score: clamp(Number(cluster.weight_score) || .6),
    support_level: ["low", "medium", "high"].includes(cluster.support_level) ? cluster.support_level : "medium",
    design_direction: clean(cluster.design_direction),
  }))
}

async function detectConflicts(clusters, semanticUnits) {
  const prompt = `你是一个“共创设计分歧分析助手”。请根据语义聚类结果和原始语义单元识别冲突。
重点识别：抽象风格 vs 具象地方符号；年轻化 vs 避免幼稚；文化元素丰富 vs 避免元素堆砌；商业传播性 vs 文化准确性；夸张醒目 vs 克制耐看。
输出JSON：{"conflicts":[{"conflict_id":"D001","conflict_topic":"","side_a":{"view":"","source_ids":[],"supporters":[]},"side_b":{"view":"","source_ids":[],"supporters":[]},"resolution_strategy":"","prompt_translation":""}]}
clusters: ${JSON.stringify(clusters)}
semantic_units: ${JSON.stringify(semanticUnits)}`
  const data = await callJson(WORKFLOW_MODEL, [{ role: "user", content: prompt }])
  return array(data.conflicts).map((item, index) => ({
    conflict_id: item.conflict_id || `D${String(index + 1).padStart(3, "0")}`,
    conflict_topic: clean(item.conflict_topic),
    side_a: { view: clean(item.side_a?.view), source_ids: array(item.side_a?.source_ids), supporters: array(item.side_a?.supporters) },
    side_b: { view: clean(item.side_b?.view), source_ids: array(item.side_b?.source_ids), supporters: array(item.side_b?.supporters) },
    resolution_strategy: clean(item.resolution_strategy),
    prompt_translation: clean(item.prompt_translation),
  }))
}

async function translateDesign(clusters, conflicts, visualUnits, links) {
  const prompt = `你是一个“文化语义到IP设计语言转译助手”。请将语义聚类、图片视觉元素、多模态关联和分歧策略转为图像生成模型能理解的设计语言。
原则：不要直接堆元素；必须说明应用部位；必须保留证据ID；采纳方式只能是 核心采纳、辅助采纳、折中采纳、约束保留、未采纳。
输出JSON：{"semantic_to_design_translation":[{"translation_id":"TR001","semantic_cluster":"","design_expression":"","applied_to":[],"evidence":[],"linked_images":[],"priority":"low|medium|high","adoption_type":"核心采纳|辅助采纳|折中采纳|约束保留|未采纳"}]}
clusters: ${JSON.stringify(clusters)}
conflicts: ${JSON.stringify(conflicts)}
visual_units: ${JSON.stringify(visualUnits.map(({ file_url, ...rest }) => rest))}
links: ${JSON.stringify(links)}`
  const data = await callJson(WORKFLOW_MODEL, [{ role: "user", content: prompt }])
  return array(data.semantic_to_design_translation).map((item, index) => ({
    translation_id: item.translation_id || `TR${String(index + 1).padStart(3, "0")}`,
    semantic_cluster: clean(item.semantic_cluster),
    design_expression: clean(item.design_expression),
    applied_to: array(item.applied_to),
    evidence: array(item.evidence),
    linked_images: array(item.linked_images),
    priority: ["low", "medium", "high"].includes(item.priority) ? item.priority : "medium",
    adoption_type: ["核心采纳", "辅助采纳", "折中采纳", "约束保留", "未采纳"].includes(item.adoption_type) ? item.adoption_type : "辅助采纳",
  }))
}

async function generateOutputs(task, semanticUnits, visualUnits, links, clusters, conflicts, translations) {
  const prompt = `你是一个“可溯源Prompt最终输出生成助手”。请基于设计转译层生成最终输出，不要直接拼接用户原文。
必须输出JSON：{
"design_brief":{"ip_positioning":"","core_temperament":"","shape_direction":"","culture_translation":"","color_system":"","style_constraints":"","conflict_strategy":""},
"prompt_result":{"prompt_zh":"","prompt_en":"","negative_prompt":"","used_translations":[],"used_sources":[],"used_images":[],"conflict_strategies":[]},
"provenance_table":[{"design_point":"","manifestation":"","sources":[],"supporters":[],"opponents":[],"linked_images":[],"translation_logic":"","adoption_type":"核心采纳|辅助采纳|折中采纳|约束保留|未采纳"}],
"material_library":[{"material_id":"M001","type":"","source_image":"","name":"","visual_features":[],"usable_for":[],"translation_rule":"","used_by_design_points":[]}]
}

任务信息：${JSON.stringify(task.task_meta)}
semantic_units: ${JSON.stringify(semanticUnits)}
visual_units: ${JSON.stringify(visualUnits.map(({ file_url, ...rest }) => rest))}
links: ${JSON.stringify(links)}
clusters: ${JSON.stringify(clusters)}
conflicts: ${JSON.stringify(conflicts)}
design_translations: ${JSON.stringify(translations)}`
  const data = await callJson(WORKFLOW_MODEL, [{ role: "user", content: prompt }], 6000)
  const material = array(data.material_library).map((item, index) => {
    const visual = visualUnits.find((v) => v.image_id === item.source_image)
    return { ...item, material_id: item.material_id || `M${String(index + 1).padStart(3, "0")}`, file_url: visual?.file_url || "" }
  })
  return {
    design_brief: data.design_brief || {},
    prompt_result: data.prompt_result || {},
    provenance_table: array(data.provenance_table),
    material_library: material,
  }
}

async function callJson(model, messages, maxTokens = 3000) {
  const requestBody = { model, messages, temperature: .2, max_tokens: maxTokens, response_format: { type: "json_object" } }
  let response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(requestBody),
  })
  let text = await response.text()

  if (!response.ok && shouldRetryWithoutJsonMode(response.status, text)) {
    const { response_format, ...fallbackBody } = requestBody
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(fallbackBody),
    })
    text = await response.text()
  }

  if (!response.ok) throw new Error(`模型调用失败 ${response.status}: ${text.slice(0, 500)}`)
  const payload = JSON.parse(text)
  const content = payload.choices?.[0]?.message?.content || "{}"
  return parseJson(content)
}

function shouldRetryWithoutJsonMode(status, text) {
  const lower = String(text || "").toLowerCase()
  return status === 400 && (lower.includes("response_format") || lower.includes("json_object") || lower.includes("unsupported"))
}

function parseJson(content) {
  try { return JSON.parse(content) } catch {}
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error("模型未返回JSON")
  return JSON.parse(match[0])
}

function array(value) { return Array.isArray(value) ? value : [] }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim() }
function clamp(value) { return Math.max(0, Math.min(1, value)) }
