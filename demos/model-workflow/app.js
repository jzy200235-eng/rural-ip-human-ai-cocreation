const NODES = [
  ["input_preprocess", "Node 1 输入预处理"],
  ["text_semantic_extraction", "Node 2 文本语义提取"],
  ["image_visual_extraction", "Node 3 图片视觉提取"],
  ["multimodal_linking", "Node 4 多模态关联"],
  ["cluster_weighting", "Node 5 聚类与权重"],
  ["conflict_detection", "Node 6 分歧识别"],
  ["design_translation", "Node 7 设计转译"],
  ["final_output", "Node 8 最终输出"],
]

const ROLE_WEIGHT = { "政府/运营方": .9, "品牌策划": .9, "文化研究者": .85, "非遗代表": .85, "商户": .8, "村民": .75, "游客": .65, "未知": .6 }
const ADOPTION_TYPES = ["核心采纳", "辅助采纳", "折中采纳", "约束保留", "未采纳"]

const TEXT_RULES = [
  { type: "design_goal", keys: ["整体", "体系", "IP", "周边", "导视", "活动", "文创", "延展", "识别"], meaning: "需要形成体系化、可延展的IP设计", implication: "角色轮廓要清晰，适合文创、导视、海报和表情包复用", cluster: "体系化延展能力" },
  { type: "culture_meaning", keys: ["海窝子", "小憩", "停留", "古镇", "本地", "地方", "文化", "非遗", "龙门绣", "戏剧", "木匠"], meaning: "需要体现海窝子在地文化与停留感", implication: "文化元素应被抽象转译为轮廓、纹理、色彩和气质", cluster: "在地文化语义" },
  { type: "personality", keys: ["亲切", "熟悉", "朋友", "招呼", "生活", "烟火", "温暖", "松弛", "幽默", "可信赖"], meaning: "角色需要亲切、温暖、有本地生活感", implication: "表情应自然微笑，姿态像会招呼游客的本地朋友", cluster: "亲切本地气质" },
  { type: "shape_preference", keys: ["鹅", "脖子", "圆润", "轮廓", "剪影", "可爱", "挺拔", "外形", "身体"], meaning: "外形需要保留鹅的识别特征并兼顾可爱感", implication: "保留修长脖颈、明显鹅喙、圆润身体和清晰剪影", cluster: "高识别鹅外形" },
  { type: "style_preference", keys: ["年轻", "拍照", "朋友圈", "传播", "咖啡", "轻扁平", "设计感", "现代", "抽象"], meaning: "风格需要年轻化、现代、适合社交传播", implication: "采用现代轻扁平插画，不做低龄玩具式卡通", cluster: "青年友好风格" },
  { type: "negative_constraint", keys: ["不要", "避免", "不能", "别", "太洋气", "幼稚", "堆砌", "复杂", "低龄", "食物化"], meaning: "存在明确负向约束", implication: "需要把限制转化为Prompt的约束条件和Negative Prompt", cluster: "风格与符号约束" },
  { type: "use_case", keys: ["文创", "导视", "海报", "表情包", "伴手礼", "包装", "门头", "活动"], meaning: "IP需要适配多个落地场景", implication: "设计要有主视觉、简化版和周边图案的延展潜力", cluster: "应用场景适配" },
  { type: "conflict_signal", keys: ["但是", "但", "同时", "既要", "又要", "不要太", "折中"], meaning: "文本中存在潜在分歧或折中诉求", implication: "后续需要保留冲突并生成折中策略", cluster: "共创分歧信号" },
]

const IMAGE_RULES = [
  { keys: ["门楼", "屋檐", "灰瓦", "瓦", "窗棂", "木梁", "木质", "古镇", "街巷"], type: "architecture", objects: ["古镇建筑", "屋檐", "木质结构"], shapes: ["层叠屋檐", "拱形入口", "窗棂格纹"], colors: ["青灰", "暖棕", "米白"], materials: ["木纹", "瓦片", "石材"], symbols: ["屋檐曲线", "门洞轮廓", "窗棂格纹"], emotions: ["古镇感", "停驻感", "欢迎"], target: "头部轮廓 / 胸前纹样 / 背景图形", rule: "不可直接复制建筑整体，只提取屋檐曲线和窗棂格纹作为简化符号" },
  { keys: ["卤鹅", "烫油鹅", "卤鸡", "麻饼", "萝卜干", "美食", "老店", "招牌", "暖光"], type: "food", objects: ["地方美食", "老字号店铺"], shapes: ["圆润", "饱满", "招牌矩形"], colors: ["鹅黄", "焦糖棕", "暖黄"], materials: ["油润光泽", "纸包质感", "木质招牌"], symbols: ["老字号招牌", "食物圆形"], emotions: ["烟火气", "好味道", "热情"], target: "色彩系统 / 身体体态 / 表情气质", rule: "参考食物的暖色和圆润感，不把角色画成食物" },
  { keys: ["龙门绣", "刺绣", "纹样", "绣线", "花鸟", "非遗", "手工", "木匠", "木作"], type: "craft", objects: ["非遗纹样", "手工细节"], shapes: ["细密曲线", "花鸟轮廓", "榫卯线条"], colors: ["绣线红", "靛蓝", "米白"], materials: ["绣线", "布纹", "木纹"], symbols: ["花鸟纹样", "绣线走向", "手作线条"], emotions: ["精致", "文化感", "手作感"], target: "翅膀纹样 / 胸前纹样 / 周边图案", rule: "只提取少量线条肌理，不大面积贴满纹样" },
  { keys: ["山", "溪流", "民宿", "渔凫", "户外", "运动", "徒步", "骑行", "自然"], type: "street", objects: ["山地", "溪流", "民宿空间"], shapes: ["舒展曲线", "向前动势"], colors: ["雾绿", "青灰", "浅米"], materials: ["自然肌理", "水波"], symbols: ["山线", "溪流曲线"], emotions: ["松弛", "探索", "清爽"], target: "身体姿态 / 背景图形 / 辅助色", rule: "转译为轻盈探索姿态，不增加复杂运动装备" },
]

const SAMPLE_TEXTS = [
  ["示例参与者A", "村民", "希望保留鹅的辨识特征，外形圆润亲切，不要像鸭子。"],
  ["示例参与者B", "商户", "需要适合门头和包装的简洁图形，避免堆砌装饰。"],
  ["示例参与者C", "游客", "希望风格年轻轻松，能看出古镇文化。"],
]
const SAMPLE_IMAGES = [
  ["海窝子古镇门楼", "architecture", "古镇入口门楼，层叠屋檐、灰瓦、木质结构、窗棂格纹、暖黄灯光。", "古镇建筑"],
  ["龙门绣纹样", "craft", "龙门绣的细密绣线、花鸟纹样、绣线红点缀、布纹手工感。", "非遗文化"],
  ["烫油鹅老店", "food", "卤鹅老店、暖黄色灯光、木棕色招牌、油润金黄、饱满圆润。", "地方美食"],
  ["渔凫民宿与山地", "street", "山地运动、溪流、民宿停留感，整体松弛、清爽，适合年轻人旅行。", "自然与民宿"],
]

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
const uniq = (arr) => [...new Set(arr.filter(Boolean))]
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim()
const hasAny = (text, keys) => keys.some((k) => text.includes(k))
let state = emptyState()

function emptyState() {
  return { job_id: "JOB_001", status: "pending", progress: 0, node_status: Object.fromEntries(NODES.map(([id]) => [id, "waiting"])), result: null }
}

function init() {
  renderTimeline()
  bindEvents()
  addTextCard()
  addImageCard()
  restoreDraft()
  updateInputHint()
  checkModelStatus()
}

function bindEvents() {
  $("#addTextBtn").addEventListener("click", () => addTextCard())
  $("#addImageBtn").addEventListener("click", () => addImageCard())
  $("#importBatchBtn").addEventListener("click", importBatchText)
  $("#loadSampleBtn").addEventListener("click", loadSample)
  $("#imageUpload").addEventListener("change", handleUpload)
  $("#startAnalysisBtn").addEventListener("click", runWorkflow)
  $("#clearBtn").addEventListener("click", clearInput)
  $("#saveDraftBtn").addEventListener("click", saveDraft)
  $("#exportMarkdownBtn").addEventListener("click", () => exportFile("haiwozi-design-brief.md", buildMarkdown(), "text/markdown;charset=utf-8"))
  $("#exportCsvBtn").addEventListener("click", () => exportCsv())
  $("#exportJsonBtn").addEventListener("click", () => exportJson())
  $("#exportMaterialBtn").addEventListener("click", () => exportFile("haiwozi-material-library.json", JSON.stringify(state.result?.material_library || [], null, 2), "application/json;charset=utf-8"))
  $$(".output-tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab)))
  $$(".copy-btn").forEach((btn) => btn.addEventListener("click", () => copyById(btn.dataset.copy)))
  ;["#provenanceSearch", "#adoptionFilter", "#imageFilter"].forEach((id) => $(id).addEventListener("input", renderProvenance))
  document.addEventListener("input", updateInputHint)
}

function addTextCard(data = {}) {
  const node = $("#textCardTemplate").content.firstElementChild.cloneNode(true)
  const id = data.source_id || `T${String($$(".text-card").length + 1).padStart(3, "0")}`
  node.dataset.sourceId = id
  $(".source-id", node).textContent = id
  $(".speaker-name", node).value = data.speaker_name || ""
  $(".speaker-role", node).value = data.speaker_role || "商户"
  $(".importance", node).value = data.importance || "normal"
  $(".related-images", node).value = (data.related_images || []).join(", ")
  $(".text-content", node).value = data.content || ""
  $(".remove-text", node).addEventListener("click", () => { node.remove(); updateInputHint() })
  $("#textList").appendChild(node)
  updateInputHint()
}

function addImageCard(data = {}) {
  const node = $("#imageCardTemplate").content.firstElementChild.cloneNode(true)
  const id = data.image_id || `IMG${String($$(".image-card").length + 1).padStart(3, "0")}`
  node.dataset.imageId = id
  $(".image-id", node).textContent = id
  $(".image-name", node).value = data.image_name || ""
  $(".image-type", node).value = data.image_type || "architecture"
  $(".image-description", node).value = data.description || ""
  $(".related-culture", node).value = data.related_culture || ""
  if (data.file_url) setImagePreview(node, data.file_url)
  $(".remove-image", node).addEventListener("click", () => { node.remove(); updateInputHint() })
  $("#imageList").appendChild(node)
  updateInputHint()
}

function setImagePreview(node, src) {
  node.dataset.fileUrl = src
  $(".image-preview", node).innerHTML = `<img src="${src}" alt="素材预览" />`
}

function handleUpload(event) {
  Array.from(event.target.files || []).forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => addImageCard({ image_name: file.name.replace(/\.[^.]+$/, ""), image_type: inferImageType(file.name), description: `图片文件：${file.name}。请补充可转译视觉元素。`, file_url: reader.result })
    reader.readAsDataURL(file)
  })
  event.target.value = ""
}

function inferImageType(name) {
  if (/绣|纹样|非遗|木匠|木作/.test(name)) return "craft"
  if (/鹅|卤|饼|食|萝卜/.test(name)) return "food"
  if (/街|店|门头/.test(name)) return "street"
  if (/山|溪|民宿|自然|运动/.test(name)) return "other"
  return "architecture"
}

function importBatchText() {
  const lines = $("#batchText").value.split(/\n+/).map(clean).filter(Boolean)
  lines.forEach((line) => {
    const parts = line.split(/[｜|]/).map(clean)
    addTextCard(parts.length >= 3 ? { speaker_name: parts[0], speaker_role: normalizeRole(parts[1]), content: parts.slice(2).join("｜") } : { content: line })
  })
  $("#batchText").value = ""
}

function loadSample() {
  $("#textList").innerHTML = ""
  $("#imageList").innerHTML = ""
  SAMPLE_TEXTS.forEach(([speaker_name, speaker_role, content]) => addTextCard({ speaker_name, speaker_role, content, importance: "high" }))
  SAMPLE_IMAGES.forEach(([image_name, image_type, description, related_culture]) => addImageCard({ image_name, image_type, description, related_culture }))
  setStatus("已载入示例", 0)
}

function clearInput() {
  $("#textList").innerHTML = ""
  $("#imageList").innerHTML = ""
  addTextCard()
  addImageCard()
  state = emptyState()
  renderTimeline()
  renderEmptyOutputs()
  setStatus("已清空", 0)
}

function collectInput() {
  return {
    task_meta: {
      project_name: clean($("#projectName").value) || "未命名项目",
      design_target: clean($("#designTarget").value) || "IP形象",
      location: clean($("#location").value),
      use_case: $$("#useCaseGroup input:checked").map((i) => i.value),
      style_preference: clean($("#stylePreference").value).split(/[、,，]/).map(clean).filter(Boolean),
    },
    texts: $$(".text-card").map((node) => ({
      source_id: node.dataset.sourceId,
      speaker_name: clean($(".speaker-name", node).value) || "未知参与者",
      speaker_role: normalizeRole($(".speaker-role", node).value),
      content: clean($(".text-content", node).value),
      related_images: clean($(".related-images", node).value).split(/[、,，]/).map(clean).filter(Boolean),
      importance: $(".importance", node).value,
    })).filter((item) => item.content),
    images: $$(".image-card").map((node) => ({
      image_id: node.dataset.imageId,
      file_url: node.dataset.fileUrl || "",
      image_type: $(".image-type", node).value,
      image_name: clean($(".image-name", node).value) || node.dataset.imageId,
      description: clean($(".image-description", node).value),
      related_culture: clean($(".related-culture", node).value),
    })).filter((item) => item.description || item.file_url || item.image_name),
  }
}

function normalizeRole(role) {
  if (/运营|政府/.test(role)) return "政府/运营方"
  if (/策划|品牌/.test(role)) return "品牌策划"
  if (/研究/.test(role)) return "文化研究者"
  if (/非遗|绣|手艺/.test(role)) return "非遗代表"
  if (/村民/.test(role)) return "村民"
  if (/游客/.test(role)) return "游客"
  if (/商户|店/.test(role)) return "商户"
  return role || "未知"
}

function updateInputHint() {
  const input = collectInput()
  $("#inputHint").textContent = `${input.texts.length} 条文字 / ${input.images.length} 张图片`
}

async function runWorkflow() {
  const raw = collectInput()
  if (!raw.texts.length && !raw.images.length) return setStatus("请至少输入一条文字或一张图片", 0, true)
  state = emptyState()
  state.status = "processing"
  NODES.forEach(([id]) => state.node_status[id] = "waiting")
  state.node_status.input_preprocess = "completed"
  state.node_status.text_semantic_extraction = "running"
  renderTimeline()
  setStatus("正在真实调用大模型分析", 12)

  try {
    const response = await fetch("/api/workflow/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(raw),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(JSON.stringify({ message: data.error || "模型分析失败", current_node: data.current_node || "unknown" }))

    NODES.forEach(([id]) => state.node_status[id] = "completed")
    state.status = "completed"
    state.result = data
    renderTimeline()
    setStatus("大模型分析完成", 100)
    renderOutputs()
    saveDraft(false)
  } catch (error) {
    state.status = "failed"
    const parsedError = parseWorkflowError(error)
    NODES.forEach(([id]) => {
      if (id === parsedError.current_node || state.node_status[id] === "running") state.node_status[id] = "failed"
    })
    renderTimeline()
    setStatus(parsedError.message || "模型分析失败", state.progress || 12, true)
  }
}

function parseWorkflowError(error) {
  try {
    return JSON.parse(error.message)
  } catch {
    return { message: error.message, current_node: "unknown" }
  }
}

function runNode(id, fn) {
  state.node_status[id] = "running"; renderTimeline()
  const result = fn()
  state.node_status[id] = "completed"
  const done = Object.values(state.node_status).filter((s) => s === "completed").length
  setStatus("分析中", Math.round(done / NODES.length * 100))
  renderTimeline()
  return result
}

function node1(raw) {
  return {
    task_meta: raw.task_meta,
    texts: raw.texts.map((t, i) => ({ ...t, source_id: t.source_id || `T${String(i + 1).padStart(3, "0")}`, content: clean(t.content), importance: t.importance || "normal" })),
    images: raw.images.map((img, i) => ({ ...img, image_id: img.image_id || `IMG${String(i + 1).padStart(3, "0")}`, image_type: img.image_type || "other" })),
  }
}

function node2(texts) {
  let n = 1
  return texts.flatMap((text) => {
    const sentences = text.content.split(/[。！？!?；;]/).map(clean).filter(Boolean)
    const units = []
    sentences.forEach((sentence) => {
      TEXT_RULES.filter((rule) => hasAny(sentence, rule.keys)).forEach((rule) => units.push({
        semantic_id: `S${String(n++).padStart(3, "0")}`,
        source_id: text.source_id,
        speaker_name: text.speaker_name,
        speaker_role: text.speaker_role,
        semantic_type: rule.type,
        raw_quote: sentence,
        extracted_meaning: rule.meaning,
        design_implication: rule.implication,
        cluster_hint: rule.cluster,
        confidence: text.importance === "high" ? .92 : .84,
      }))
    })
    if (!units.length) units.push({ semantic_id: `S${String(n++).padStart(3, "0")}`, source_id: text.source_id, speaker_name: text.speaker_name, speaker_role: text.speaker_role, semantic_type: "design_goal", raw_quote: text.content, extracted_meaning: "提供了与IP设计相关的综合意见", design_implication: "作为设计简报的辅助参考，需结合其他材料判断是否采纳", cluster_hint: "综合设计诉求", confidence: .66 })
    return units
  })
}

function node3(images) {
  return images.map((img) => {
    const text = `${img.image_name} ${img.description} ${img.related_culture}`
    const matched = IMAGE_RULES.filter((rule) => hasAny(text, rule.keys))
    const rules = matched.length ? matched : [{ type: img.image_type || "other", objects: [img.image_name], shapes: ["可补充形态特征"], colors: ["待提取"], materials: ["待提取"], symbols: ["待提取"], emotions: ["待判断"], target: "待指定", rule: "需要补充图片说明后再转译" }]
    return {
      image_id: img.image_id,
      image_name: img.image_name,
      file_url: img.file_url,
      image_type: img.image_type,
      description: img.description,
      visual_objects: uniq(rules.flatMap((r) => r.objects)),
      shape_features: uniq(rules.flatMap((r) => r.shapes)),
      color_palette: uniq(rules.flatMap((r) => r.colors)),
      material_features: uniq(rules.flatMap((r) => r.materials)),
      symbolic_elements: uniq(rules.flatMap((r) => r.symbols)),
      emotional_keywords: uniq(rules.flatMap((r) => r.emotions)),
      design_translation: rules.map((r) => ({ target_part: r.target, translation: r.rule, confidence: .86 })),
    }
  })
}

function node4(semantics, visuals) {
  let n = 1
  const links = []
  semantics.forEach((s) => visuals.forEach((v) => {
    const hay = `${s.raw_quote} ${s.extracted_meaning} ${s.design_implication}`
    const visualWords = [...v.visual_objects, ...v.shape_features, ...v.color_palette, ...v.material_features, ...v.symbolic_elements, ...v.emotional_keywords]
    const hit = visualWords.filter((w) => w !== "待提取" && hay.includes(w.replace(/感|色|形|线/g, ""))).length
    const emotionHit = v.emotional_keywords.some((w) => hay.includes(w))
    const direct = (s.source_id && collectInput().texts.find((t) => t.source_id === s.source_id)?.related_images.includes(v.image_id))
    if (hit || emotionHit || direct) links.push({ link_id: `L${String(n++).padStart(3, "0")}`, semantic_id: s.semantic_id, image_id: v.image_id, relationship_type: hit > 1 || emotionHit || direct ? "supports" : "partial_support", reason: `文本语义“${s.extracted_meaning}”与图片元素“${visualWords.slice(0, 5).join("、")}”存在设计关联`, design_use: v.design_translation[0]?.target_part || "设计细节" })
  }))
  return links
}

function node5(semantics, links) {
  const groups = new Map()
  semantics.forEach((s) => {
    const key = s.cluster_hint || s.semantic_type
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  })
  let n = 1
  return Array.from(groups.entries()).map(([name, units]) => {
    const frequency = Math.min(1, units.length / 4)
    const role = units.reduce((sum, u) => sum + (ROLE_WEIGHT[u.speaker_role] || .6), 0) / units.length
    const strength = units.reduce((sum, u) => sum + u.confidence, 0) / units.length
    const imageSupport = Math.min(1, links.filter((l) => units.some((u) => u.semantic_id === l.semantic_id)).length / 3)
    const relevance = ["亲切本地气质", "在地文化语义", "高识别鹅外形", "青年友好风格", "体系化延展能力"].includes(name) ? .95 : .75
    const weight_score = +(frequency * .3 + role * .2 + strength * .15 + relevance * .2 + imageSupport * .15).toFixed(2)
    return { cluster_id: `C${String(n++).padStart(3, "0")}`, cluster_name: name, included_semantics: units.map((u) => u.semantic_id), supporters: uniq(units.map((u) => u.speaker_name)), opponents: [], weight_score, support_level: weight_score >= .75 ? "high" : weight_score >= .55 ? "medium" : "low", design_direction: summarizeCluster(name) }
  }).sort((a, b) => b.weight_score - a.weight_score)
}

function summarizeCluster(name) {
  const map = {
    "亲切本地气质": "角色应像古镇中的本地朋友，给人欢迎、亲切、可接近的感觉",
    "青年友好风格": "采用年轻、轻扁平、有品牌感的视觉语言，适合拍照和社交传播",
    "在地文化语义": "将海窝子古镇、非遗和地方生活转译为克制的轮廓、纹样和色彩",
    "高识别鹅外形": "保留鹅的修长脖颈、鹅喙、圆润身体和清晰剪影",
    "体系化延展能力": "保证形象可拆解为文创、导视、活动海报、表情包和周边图案",
    "风格与符号约束": "控制文化符号密度，避免低龄化、食物化和元素堆砌",
    "应用场景适配": "角色应适合主视觉、导视、周边和传播物料复用",
    "共创分歧信号": "保留不同参与者的审美冲突，并转化为折中策略",
  }
  return map[name] || "作为辅助设计方向进入后续转译"
}

function node6(semantics) {
  const text = semantics.map((s) => s.raw_quote).join(" ")
  const conflicts = []
  const add = (topic, a, b, keysA, keysB, strategy, prompt) => {
    if (hasAny(text, keysA) && hasAny(text, keysB)) conflicts.push({ conflict_id: `D${String(conflicts.length + 1).padStart(3, "0")}`, conflict_topic: topic, side_a: { view: a, source_ids: sourcesByKeys(semantics, keysA), supporters: supportersByKeys(semantics, keysA) }, side_b: { view: b, source_ids: sourcesByKeys(semantics, keysB), supporters: supportersByKeys(semantics, keysB) }, resolution_strategy: strategy, prompt_translation: prompt })
  }
  add("年轻化 vs 避免低龄化", "希望年轻、好传播、适合社交媒体", "不要幼稚、不要儿童卡通感", ["年轻", "拍照", "传播", "朋友圈"], ["幼稚", "低龄", "不要"], "采用现代轻扁平、简洁有设计感的风格，控制头身比、五官比例和表情幅度。", "young-friendly but not childish, modern flat illustration, subtle expression")
  add("文化表达丰富 vs 避免元素堆砌", "希望保留龙门绣、古镇建筑等地方文化", "不要把文化元素生硬贴满", ["龙门绣", "非遗", "古镇", "文化"], ["堆砌", "生硬", "不要"], "只保留1-2个关键文化细节，将文化元素转译为轮廓、线条或色彩。", "restrained cultural details, no element stacking")
  add("地方美食识别 vs 避免食物化", "希望游客联想到卤鹅和老字号好味道", "不要把鹅直接画成食物", ["卤鹅", "老字号", "美食", "好味道"], ["食物化", "不要把鹅直接画成食物"], "参考暖色和圆润感，但角色保持独立IP人格。", "warm food-inspired palette, not food-shaped character")
  return conflicts
}
function sourcesByKeys(units, keys) { return uniq(units.filter((u) => hasAny(u.raw_quote, keys)).map((u) => u.source_id)) }
function supportersByKeys(units, keys) { return uniq(units.filter((u) => hasAny(u.raw_quote, keys)).map((u) => u.speaker_name)) }

function node7(clusters, conflicts, visuals, links) {
  let n = 1
  return clusters.map((c) => {
    const linked = uniq(links.filter((l) => c.included_semantics.includes(l.semantic_id)).map((l) => l.image_id))
    const visualParts = visuals.filter((v) => linked.includes(v.image_id)).flatMap((v) => v.design_translation.map((t) => t.target_part))
    const conflict = conflicts.find((d) => d.side_a.source_ids.length || d.side_b.source_ids.length)
    const isConstraint = c.cluster_name.includes("约束") || c.cluster_name.includes("分歧")
    return { translation_id: `TR${String(n++).padStart(3, "0")}`, semantic_cluster: c.cluster_name, design_expression: translateExpression(c.cluster_name, linked, conflict), applied_to: appliedTo(c.cluster_name, visualParts), evidence: [c.cluster_id, ...c.included_semantics, ...linked], linked_images: linked, priority: c.support_level === "high" ? "high" : "medium", adoption_type: isConstraint ? "约束保留" : conflict && c.cluster_name.includes("风格") ? "折中采纳" : c.support_level === "high" ? "核心采纳" : "辅助采纳" }
  })
}

function translateExpression(name, linked, conflict) {
  const map = {
    "亲切本地气质": "自然站姿、轻微前倾、柔和微笑、眼神平和，像会招呼游客的本地鹅朋友",
    "青年友好风格": "现代轻扁平插画，干净轮廓，克制表情，有品牌感和社交传播感",
    "在地文化语义": "将古镇灰瓦、龙门绣、木作与老字号气质转译为局部轮廓、羽毛线条和暖色系统",
    "高识别鹅外形": "保留修长脖颈、明显鹅喙、圆润身体和清晰剪影，Q版但不低龄",
    "体系化延展能力": "主形象简洁，便于拆解为头像、贴纸、导视符号、海报主视觉和文创图案",
    "风格与符号约束": "只保留1-2个关键文化细节，避免食物化、复杂背景、堆满配饰和幼儿动画感",
    "应用场景适配": "输出适合白底单角色、导视图形、表情包和周边印刷的主视觉",
    "共创分歧信号": conflict ? conflict.resolution_strategy : "保留冲突来源，采用克制、可延展的折中设计策略",
  }
  return `${map[name] || "作为辅助细节进入角色设计"}${linked.length ? `；由图片 ${linked.join("、")} 提供视觉支撑` : ""}`
}
function appliedTo(name, extra) {
  const base = { "亲切本地气质": ["姿态", "表情", "角色气质"], "青年友好风格": ["画风", "线条", "传播气质"], "在地文化语义": ["头部轮廓", "翅膀纹样", "色彩系统"], "高识别鹅外形": ["身体轮廓", "头颈", "鹅喙"], "体系化延展能力": ["剪影", "周边延展", "导视符号"], "风格与符号约束": ["Negative Prompt", "符号密度", "配饰控制"], "应用场景适配": ["文创", "海报", "表情包"], "共创分歧信号": ["折中策略", "Prompt约束"] }[name] || ["设计细节"]
  return uniq([...base, ...extra])
}

function node8(task, semantics, visuals, links, clusters, conflicts, translations) {
  const design_brief = makeBrief(task.task_meta, clusters, conflicts, translations)
  const prompt_result = makePrompt(task.task_meta, translations, conflicts)
  const provenance_table = translations.map((tr) => makeProvenanceRow(tr, semantics, visuals, clusters, conflicts))
  const material_library = visuals.map((v, i) => makeMaterial(v, i, links, translations))
  return { design_brief, prompt_result, provenance_table, material_library }
}

function makeBrief(meta, clusters, conflicts, translations) {
  const top = clusters.slice(0, 5)
  return {
    ip_positioning: `${meta.location}的${meta.design_target}：不是普通卡通鹅，而是“鹅/贺”谐音下的欢迎型、祝福型古镇朋友。`,
    core_temperament: top.map((c) => c.design_direction).join("；"),
    shape_direction: translations.find((t) => t.semantic_cluster.includes("鹅外形"))?.design_expression || "保留鹅的头颈、鹅喙、圆润身体和清晰剪影。",
    culture_translation: translations.filter((t) => t.linked_images?.length).map((t) => t.design_expression).join("；") || "文化元素以轮廓、纹样、色彩和气质方式进入设计。",
    color_system: "米白、鹅黄为主色，结合青灰、暖棕、小面积绣线红；来自古镇灰瓦、木作、烫油鹅和龙门绣素材。",
    style_constraints: "现代轻扁平、手工线条感、品牌化、年轻友好；避免低龄化、食物化、过度国潮和元素堆砌。",
    conflict_strategy: conflicts.length ? conflicts.map((c) => `${c.conflict_topic}：${c.resolution_strategy}`).join("；") : "当前输入未识别到强分歧，采用共识优先的主方案。",
  }
}

function makePrompt(meta, translations, conflicts) {
  const expressions = translations.filter((t) => t.adoption_type !== "未采纳").map((t) => t.design_expression)
  const conflictText = conflicts.map((c) => c.prompt_translation).join(", ")
  const prompt_zh = `为${meta.location}设计一个原创${meta.design_target}形象。角色定位是“海窝子古镇的鹅朋友”和“鹅/贺”祝福化身。外形保留鹅的修长脖颈、明显鹅喙、圆润身体和高识别剪影，Q版但不低龄。${expressions.join("；")}。色彩以米白、鹅黄、青灰、暖棕为主，少量绣线红点缀。采用现代轻扁平插画与克制手工线条，单角色完整形象，浅色干净背景，适合${meta.use_case.join("、")}。文化元素必须经过抽象转译，不要直接堆砌建筑、食物、刺绣和装备。${conflicts.length ? `分歧折中：${conflicts.map((c) => c.resolution_strategy).join("；")}` : ""}`
  const prompt_en = `Design an original goose IP character for ${meta.location}. The character is a friendly local goose and a blessing mascot based on the Chinese wordplay between goose and congratulations. Keep a recognizable goose silhouette: long neck, clear beak, rounded body, simple wings, cute but not childish. ${expressions.join("; ")}. Use warm ivory, goose yellow, blue grey, warm wood brown, with a small accent of embroidery red. Modern flat illustration, subtle handcrafted line details, clean light background, brand-ready character design for ${meta.use_case.join(", ")}. Cultural elements should be abstractly translated into silhouette, feather lines, palette and texture, not stacked as literal decorations. ${conflictText}`
  const negative_prompt = "元素堆砌, 写实鹅, 食物拟人, 幼儿卡通, 复杂背景, 过度国潮, 堆满建筑/刺绣/运动装备, 廉价吉祥物, 大眼卖萌, 低清晰度, 模仿已有知名IP"
  return { prompt_zh, prompt_en, negative_prompt, used_translations: translations.map((t) => t.translation_id), used_sources: uniq(translations.flatMap((t) => t.evidence.filter((e) => e.startsWith("S") || e.startsWith("T")))), used_images: uniq(translations.flatMap((t) => t.linked_images || [])), conflict_strategies: conflicts.map((c) => c.conflict_id) }
}

function makeProvenanceRow(tr, semantics, visuals, clusters, conflicts) {
  const semanticIds = tr.evidence.filter((e) => e.startsWith("S"))
  const sourceUnits = semantics.filter((s) => semanticIds.includes(s.semantic_id))
  const cluster = clusters.find((c) => c.cluster_name === tr.semantic_cluster)
  const relatedConflict = conflicts.find((c) => c.side_a.source_ids.some((id) => sourceUnits.some((s) => s.source_id === id)) || c.side_b.source_ids.some((id) => sourceUnits.some((s) => s.source_id === id)))
  return { design_point: tr.semantic_cluster, manifestation: tr.design_expression, sources: uniq(sourceUnits.map((s) => s.source_id)), supporters: uniq(sourceUnits.map((s) => s.speaker_name)), opponents: relatedConflict ? uniq([...(relatedConflict.side_a.supporters || []), ...(relatedConflict.side_b.supporters || [])]) : [], linked_images: tr.linked_images || [], translation_logic: `基于${cluster?.included_semantics.length || semanticIds.length}条语义单元与${tr.linked_images?.length || 0}张图片支撑，将“${cluster?.design_direction || tr.semantic_cluster}”转译为${tr.applied_to.join("、")}上的设计表达。`, adoption_type: tr.adoption_type }
}

function makeMaterial(v, index, links, translations) {
  const usedBy = translations.filter((t) => t.linked_images?.includes(v.image_id)).map((t) => t.semantic_cluster)
  return { material_id: `M${String(index + 1).padStart(3, "0")}`, type: v.image_type, source_image: v.image_id, name: v.image_name, file_url: v.file_url, visual_features: uniq([...v.visual_objects, ...v.shape_features, ...v.color_palette, ...v.material_features, ...v.symbolic_elements, ...v.emotional_keywords]), usable_for: uniq(v.design_translation.map((t) => t.target_part)), translation_rule: v.design_translation.map((t) => t.translation).join("；"), used_by_design_points: usedBy, link_count: links.filter((l) => l.image_id === v.image_id).length }
}

async function checkModelStatus() {
  const el = $("#modelStatus")
  if (!el) return
  try {
    const response = await fetch("/api/model/status")
    const data = await response.json()
    if (data.configured) {
      el.textContent = `真实模型：${data.text_model} / ${data.vision_model}${data.supports_image_input ? " · 视觉输入" : " · 图片说明分析"}`
      el.classList.add("strong")
    } else {
      el.textContent = "未配置模型 Key"
      el.style.background = "var(--red)"
      el.style.color = "#fff"
    }
  } catch {
    el.textContent = "请用 server.mjs 启动"
    el.style.background = "var(--red)"
    el.style.color = "#fff"
  }
}

function renderTimeline() {
  $("#nodeTimeline").innerHTML = NODES.map(([id, label]) => `<div class="node-item ${state.node_status[id]}"><strong>${label}</strong><span>${state.node_status[id]}</span></div>`).join("")
}
function setStatus(text, progress, isError = false) { state.progress = progress; $("#globalStatus").textContent = text; $("#globalStatus").style.background = isError ? "var(--red)" : "var(--gold)"; $("#progressBar").style.width = `${progress}%` }
function switchTab(tab) { $$(".output-tab").forEach((t) => t.classList.remove("is-active")); $$(".output-panel").forEach((p) => p.classList.remove("is-active")); tab.classList.add("is-active"); $(`#${tab.dataset.outputTab}`).classList.add("is-active") }

function renderOutputs() {
  renderBrief(); renderPrompt(); populateFilters(); renderProvenance(); renderMaterials()
}
function renderEmptyOutputs() {
  $("#briefContent").className = "brief-grid empty-state"; $("#briefContent").textContent = "运行后生成设计简报。"; $("#promptZh").value = ""; $("#promptEn").value = ""; $("#negativePrompt").value = ""; $("#provenanceBody").innerHTML = '<tr><td colspan="8" class="empty-cell">暂无溯源数据。</td></tr>'; $("#materialGrid").className = "material-grid empty-state"; $("#materialGrid").textContent = "运行后生成素材库。"
}
function renderBrief() {
  const b = state.result.design_brief
  const items = [["IP定位", b.ip_positioning], ["核心气质", b.core_temperament], ["外形方向", b.shape_direction], ["文化转译策略", b.culture_translation], ["色彩系统", b.color_system], ["风格约束", b.style_constraints], ["分歧折中策略", b.conflict_strategy]]
  $("#briefContent").className = "brief-grid"
  $("#briefContent").innerHTML = items.map(([k, v]) => `<article class="brief-card"><h3>${esc(k)}</h3><p>${esc(v)}</p></article>`).join("")
}
function renderPrompt() {
  const p = state.result.prompt_result
  $("#promptZh").value = p.prompt_zh; $("#promptEn").value = p.prompt_en; $("#negativePrompt").value = p.negative_prompt
  $("#promptEvidence").innerHTML = [["使用转译", p.used_translations.join("、")], ["文字来源", p.used_sources.join("、") || "无"], ["图片支撑", p.used_images.join("、") || "无"]].map(([k, v]) => `<div class="evidence-card"><strong>${k}</strong><br>${esc(v)}</div>`).join("")
}
function populateFilters() {
  $("#adoptionFilter").innerHTML = `<option value="all">全部采纳方式</option>${ADOPTION_TYPES.map((t) => `<option>${t}</option>`).join("")}`
  const images = state.result.material_library.map((m) => m.source_image)
  $("#imageFilter").innerHTML = `<option value="all">全部图片</option>${images.map((id) => `<option>${id}</option>`).join("")}`
}
function renderProvenance() {
  if (!state.result) return
  const q = clean($("#provenanceSearch").value)
  const adoption = $("#adoptionFilter").value
  const img = $("#imageFilter").value
  const rows = state.result.provenance_table.filter((r) => (adoption === "all" || r.adoption_type === adoption) && (img === "all" || r.linked_images.includes(img)) && (!q || JSON.stringify(r).includes(q)))
  $("#provenanceBody").innerHTML = rows.length ? rows.map((r) => `<tr><td>${esc(r.design_point)}</td><td>${esc(r.manifestation)}</td><td>${esc(r.sources.join("、"))}</td><td>${esc(r.supporters.join("、"))}</td><td>${esc((r.opponents || []).join("、") || "无")}</td><td>${esc((r.linked_images || []).join("、") || "无")}</td><td>${esc(r.translation_logic)}</td><td>${esc(r.adoption_type)}</td></tr>`).join("") : '<tr><td colspan="8" class="empty-cell">没有匹配结果。</td></tr>'
}
function renderMaterials() {
  const list = state.result.material_library
  $("#materialGrid").className = "material-grid"
  $("#materialGrid").innerHTML = list.map((m) => `<article class="material-card"><div class="material-thumb">${m.file_url ? `<img src="${m.file_url}" alt="${esc(m.name)}" />` : esc(m.source_image)}</div><h3>${esc(m.name)} · ${esc(m.source_image)}</h3><p>${esc(m.translation_rule)}</p><div class="tag-list">${m.visual_features.slice(0, 12).map((f) => `<span class="tag">${esc(f)}</span>`).join("")}</div><p>可用于：${esc(m.usable_for.join("、"))}</p><p>被使用：${esc(m.used_by_design_points.join("、") || "暂未使用")}</p></article>`).join("")
}

function buildMarkdown() {
  if (!state.result) return "# 暂无结果"
  const b = state.result.design_brief, p = state.result.prompt_result
  return `# ${state.result.task.task_meta.project_name} 设计简报\n\n## 1. IP定位\n${b.ip_positioning}\n\n## 2. 核心气质\n${b.core_temperament}\n\n## 3. 外形方向\n${b.shape_direction}\n\n## 4. 文化转译策略\n${b.culture_translation}\n\n## 5. 色彩系统\n${b.color_system}\n\n## 6. 风格约束\n${b.style_constraints}\n\n## 7. 分歧折中策略\n${b.conflict_strategy}\n\n## 中文 Prompt\n${p.prompt_zh}\n\n## English Prompt\n${p.prompt_en}\n\n## Negative Prompt\n${p.negative_prompt}\n`
}
function exportCsv() {
  if (!state.result) return
  const rows = [["设计点", "具体表现", "来源", "支持者", "反对者/分歧", "相关图片", "转译逻辑", "采纳方式"], ...state.result.provenance_table.map((r) => [r.design_point, r.manifestation, r.sources.join("、"), r.supporters.join("、"), (r.opponents || []).join("、"), (r.linked_images || []).join("、"), r.translation_logic, r.adoption_type])]
  exportFile("haiwozi-provenance.csv", `\ufeff${rows.map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n")}`, "text/csv;charset=utf-8")
}
function exportJson() { if (state.result) exportFile("haiwozi-workflow-result.json", JSON.stringify(state.result, null, 2), "application/json;charset=utf-8") }
function exportFile(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url) }
function copyById(id) { const el = $(`#${id}`); if (!el?.value) return; navigator.clipboard.writeText(el.value); setStatus("已复制", state.progress || 100) }
function saveDraft(show = true) { localStorage.setItem("haiwozi-workflow-draft", JSON.stringify(collectInput())); if (show) setStatus("草稿已保存", state.progress || 0) }
function restoreDraft() { const raw = localStorage.getItem("haiwozi-workflow-draft"); if (!raw) return; try { const d = JSON.parse(raw); $("#projectName").value = d.task_meta?.project_name || $("#projectName").value; $("#designTarget").value = d.task_meta?.design_target || $("#designTarget").value; $("#location").value = d.task_meta?.location || $("#location").value; if (d.texts?.length) { $("#textList").innerHTML = ""; d.texts.forEach(addTextCard) } if (d.images?.length) { $("#imageList").innerHTML = ""; d.images.forEach(addImageCard) } } catch {} }
function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])) }

init()
