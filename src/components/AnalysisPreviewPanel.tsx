import { Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisPayload, AnalysisTextSource } from "../lib/analysisPreview";
import { Card } from "./ui/card";

const WORKFLOW_STEP_TOTAL = 8;
type AnalysisTab = "trace" | "materials";
type AnalysisJobState = {
  progress: number;
  statusLabel: string;
  result: AnalysisPayload | null;
  updatedAt: string;
};

export function AnalysisPreviewPanel({ payload }: { payload: AnalysisPayload }) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("trace");
  const analysisJob = useAnalysisJob(payload);
  const resultPayload = analysisJob.result;
  const isReady = analysisJob.progress >= 100 && Boolean(resultPayload);

  return (
    <Card className="glass-panel overflow-hidden rounded-b-[32px] rounded-t-none border-white/60 shadow-[0_24px_70px_rgba(55,83,150,0.14)]">
      <CompactWorkflowStatus job={analysisJob} generatedAt={payload.generatedAt} />
      <div className="flex flex-col gap-3 border-b border-white/45 bg-white/30 p-3 sm:flex-row">
        {[
          ["trace", "设计溯源表"],
          ["materials", "素材库"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as AnalysisTab)}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${activeTab === key ? "border border-blue-200/70 bg-blue-50/80 text-[var(--color-brand-primary)] shadow-[0_8px_20px_rgba(93,157,240,0.14),inset_0_1px_0_rgba(255,255,255,0.82)]" : "glass-chip text-slate-500 hover:bg-white/50 hover:text-[var(--color-brand-primary)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-[480px] bg-white/40 p-4 sm:p-5 lg:p-6">
        {!isReady || !resultPayload ? (
          <AnalysisLoadingPlaceholder activeTab={activeTab} statusLabel={analysisJob.statusLabel} />
        ) : (
          <>
            {activeTab === "trace" ? <TracePreview payload={resultPayload} /> : null}
            {activeTab === "materials" ? <MaterialPreview payload={resultPayload} /> : null}
          </>
        )}
      </div>
    </Card>
  );
}

function useAnalysisJob(payload: AnalysisPayload): AnalysisJobState {
  const [job, setJob] = useState<AnalysisJobState>({
    progress: 8,
    statusLabel: "正在创建分析任务",
    result: null,
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    const controller = new AbortController();
    const resetTimer = window.setTimeout(() => {
      setJob({ progress: 8, statusLabel: "正在创建分析任务", result: null, updatedAt: new Date().toISOString() });
    }, 0);

    requestAnalysisJob(payload, controller.signal, (checkpoint) => {
      setJob({ ...checkpoint, result: null, updatedAt: new Date().toISOString() });
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setJob({ progress: 100, statusLabel: "分析完成 · 结果已就绪", result, updatedAt: new Date().toISOString() });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setJob({ progress: 100, statusLabel: "分析完成 · 结果已就绪", result: payload, updatedAt: new Date().toISOString() });
      });

    return () => {
      window.clearTimeout(resetTimer);
      controller.abort();
    };
  }, [payload]);

  return job;
}

function requestAnalysisJob(
  payload: AnalysisPayload,
  signal: AbortSignal,
  onProgress: (checkpoint: Pick<AnalysisJobState, "progress" | "statusLabel">) => void,
): Promise<AnalysisPayload> {
  const checkpoints = [
    { delay: 160, progress: 18, statusLabel: "正在创建分析任务" },
    { delay: 620, progress: 36, statusLabel: "正在清洗文字意见" },
    { delay: 1120, progress: 58, statusLabel: "正在提取图片与语义特征" },
    { delay: 1660, progress: 76, statusLabel: "正在聚类参与者诉求" },
    { delay: 2200, progress: 92, statusLabel: "正在生成设计转译结论" },
  ];

  return new Promise((resolve, reject) => {
    const timers = checkpoints.map((checkpoint) => window.setTimeout(() => {
      if (signal.aborted) return;
      onProgress({ progress: checkpoint.progress, statusLabel: checkpoint.statusLabel });
    }, checkpoint.delay));

    const doneTimer = window.setTimeout(() => {
      if (signal.aborted) return reject(new DOMException("Analysis request aborted", "AbortError"));
      resolve(payload);
    }, 2700);

    signal.addEventListener("abort", () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
      reject(new DOMException("Analysis request aborted", "AbortError"));
    }, { once: true });
  });
}

function AnalysisLoadingPlaceholder({ activeTab, statusLabel }: { activeTab: AnalysisTab; statusLabel: string }) {
  const titleMap: Record<AnalysisTab, string> = {
    trace: "设计溯源表",
    materials: "素材库",
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/40 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
      <div className="pointer-events-none absolute inset-0 animate-[shimmer_1.55s_linear_infinite] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.36)_44%,transparent_72%)]" />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">
            <span className="size-2 rounded-full bg-[var(--color-brand-primary)] animate-ping" />
            正在分析中...
          </div>
          <h3 className="mt-4 text-2xl font-black text-slate-900">{titleMap[activeTab]}生成中</h3>
          <p className="mt-2 text-sm font-semibold text-slate-500">{statusLabel}，完成后显示本地规则生成的演示结果。</p>
        </div>
      </div>
      <div className="relative mt-7 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-white/70 bg-white/50 p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200/80" />
            <div className="mt-5 space-y-3">
              <div className="h-3 w-full animate-pulse rounded-full bg-slate-200/70" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200/60" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactWorkflowStatus({ job, generatedAt }: { job: AnalysisJobState; generatedAt: string }) {
  const completedSteps = Math.min(WORKFLOW_STEP_TOTAL, Math.round((job.progress / 100) * WORKFLOW_STEP_TOTAL));
  const isComplete = job.progress >= 100;

  return (
    <div className="border-b border-white/45 bg-white/35 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">
            <Sparkles size={13} className={isComplete ? "" : "animate-pulse"} /> 分析进度
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${isComplete ? "bg-green-50 text-green-700 ring-green-100" : "bg-white/60 text-[var(--color-brand-primary)] ring-white/70"}`}>
            {job.statusLabel}
          </span>
          <span className="text-xs font-bold text-slate-500">生成时间 {formatTime(generatedAt)}</span>
        </div>
        <div className="flex min-w-[260px] items-center gap-3 lg:w-[360px]">
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-900/5 ring-1 ring-white/80">
            <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-[#24D29B] via-[var(--color-brand-secondary)] to-[var(--color-brand-accent)] transition-all duration-700 ease-out" style={{ width: `${job.progress}%` }}>
              {!isComplete ? <div className="absolute inset-0 animate-[shimmer_1.25s_linear_infinite] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.55)_42%,transparent_72%)]" /> : null}
            </div>
          </div>
          <span className="w-20 text-right text-xs font-black text-slate-700">{completedSteps}/{WORKFLOW_STEP_TOTAL} 节点</span>
        </div>
      </div>
    </div>
  );
}

type UserSource = {
  code: string;
  label: string;
};

type TraceDimension = {
  title: string;
  description: string;
  consensusUsers: string[];
  divergentUsers: string[];
  opinions: Array<{ id: string; source: string; type: "共识" | "分歧"; content: string }>;
};

type MaterialElementCard = {
  id: string;
  title: string;
  category: string;
  sources: UserSource[];
  tags: string[];
  imageUrl: string;
};

const TRACE_DIMENSION_CONFIGS = [
  { title: "主体与造型基础", description: "角色主体、轮廓、物种识别与基础造型。", keywords: ["鹅", "鸭", "造型", "卡通", "本地", "酱鹅"], consensus: "保留鹅 IP 主体和酱鹅识别点。", divergence: "不要只像普通卡通鸭，需避免物种识别偏差。" },
  { title: "性格气质", description: "角色性格、亲和力、情绪与人格设定。", keywords: ["亲切", "表情", "活泼", "热闹", "温暖"], consensus: "角色需要更亲切、更有欢迎感。", divergence: "活泼度不能过高，否则会削弱本地稳重感。" },
  { title: "风格调性", description: "整体视觉风格、现代感、年轻化与可传播程度。", keywords: ["年轻", "传播", "卡通", "热闹", "风格"], consensus: "风格应轻松、年轻且便于传播。", divergence: "不能过度幼儿卡通或廉价吉祥物化。" },
  { title: "文化表达", description: "古镇、美食、非遗与地方故事的表达方式。", keywords: ["本地", "海窝子", "古镇", "酱鹅", "手艺", "文化"], consensus: "文化记忆点需要被清晰保留。", divergence: "文化符号不能直接堆砌，应做抽象转译。" },
  { title: "色彩系统", description: "主色、辅助色、情绪色与应用场景色彩。", keywords: ["颜色", "热闹", "红", "喜庆", "色彩"], consensus: "颜色可以更热闹，增强节庆与传播感。", divergence: "色彩不能太花，避免影响识别和高级感。" },
  { title: "图案与材质", description: "纹样、材质、肌理、包装与视觉装饰规则。", keywords: ["纹样", "材质", "竹编", "图案", "贴纸", "围裙"], consensus: "可引入围裙、竹编、招牌等材质线索。", divergence: "纹样不能铺满角色，需控制装饰密度。" },
  { title: "局部元素", description: "表情、配饰、服装、动作、手持物与细节道具。", keywords: ["表情", "围裙", "招牌", "帽", "头饰", "手持", "动作", "门头"], consensus: "围裙、招牌、表情是高价值局部元素。", divergence: "锅具、食物、头饰等元素需避免过度夸张。" },
  { title: "约束与禁忌", description: "明确不应出现的方向、误读风险与风格边界。", keywords: ["不要", "避免", "普通", "堆砌", "太"], consensus: "避免元素堆砌、普通鸭化和过度卡通化。", divergence: "不同群体对热闹程度、土气程度与装饰密度有差异。" },
];

const ELEMENT_BLUEPRINTS = [
  { category: "表情", title: "亲切微笑表情", keywords: ["表情", "亲切"], description: "来自用户对亲切感和欢迎感的要求，可转译为圆眼、微笑嘴型和柔和脸部比例。" },
  { category: "配饰", title: "帽子 / 头饰 / 眼镜 / 手持物", keywords: ["帽", "头饰", "眼镜", "手持", "招牌", "锅", "托盘"], description: "用于强化身份和地方记忆点，但需控制数量，避免符号堆叠。" },
  { category: "服装", title: "围裙与门头贴纸风格", keywords: ["围裙", "门头", "贴纸"], description: "商户意见指向可落地的门店应用，可转译为围裙、胸牌、贴纸边框。" },
  { category: "动作", title: "招呼 / 点赞 / 端盘动作", keywords: ["动作", "招呼", "点赞", "端盘", "活泼"], description: "用于增强社交传播和表情包延展能力。" },
  { category: "纹样", title: "竹编与古镇纹样", keywords: ["纹样", "竹编", "古镇", "手艺"], description: "从地方手艺和建筑肌理中抽象出低密度装饰纹样。" },
  { category: "背景", title: "古镇场景与摊位背景", keywords: ["背景", "古镇", "摊位", "招牌"], description: "适合用于海报、导视和活动场景，不建议直接塞进角色主体。" },
];

function TracePreview({ payload }: { payload: AnalysisPayload }) {
  const dimensions = buildTraceDimensions(payload);

  return (
    <div className="overflow-x-auto rounded-[28px] border border-white/70 bg-white/60 p-3 shadow-[0_18px_46px_rgba(49,95,232,0.10)] backdrop-blur-xl">
      <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
        <thead>
          <tr>
            <th className="w-[240px] rounded-l-2xl bg-white/75 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-400">维度</th>
            <th className="bg-blue-50/80 px-4 py-3 text-sm font-black text-[var(--color-brand-primary)]">共识点</th>
            <th className="rounded-r-2xl bg-rose-50/80 px-4 py-3 text-sm font-black text-rose-500">分歧点</th>
          </tr>
        </thead>
        <tbody>
          {dimensions.map((dimension) => {
            const consensus = dimension.opinions.filter((item) => item.type === "共识");
            const divergence = dimension.opinions.filter((item) => item.type === "分歧");
            return (
              <tr key={dimension.title} className="align-top">
                <th className="rounded-l-2xl border-y border-l border-white/70 bg-white/75 px-4 py-4">
                  <div className="text-base font-black text-slate-900">{dimension.title}</div>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{dimension.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-[var(--color-brand-primary)]">共识 {consensus.length}</span>
                    <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-500">分歧 {divergence.length}</span>
                  </div>
                </th>
                <TraceMatrixColumnCell type="共识" opinions={consensus} />
                <TraceMatrixColumnCell type="分歧" opinions={divergence} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TraceMatrixColumnCell({ type, opinions }: { type: "共识" | "分歧"; opinions: TraceDimension["opinions"] }) {
  const isConsensus = type === "共识";
  return (
    <td className={`border-y border-white/70 px-4 py-4 ${isConsensus ? "bg-blue-50/50" : "rounded-r-2xl border-r bg-rose-50/50"}`}>
      <div className="space-y-3">
        {opinions.length ? opinions.map((opinion) => (
          <article key={opinion.id} className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-[0_10px_24px_rgba(49,95,232,0.06)]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${isConsensus ? "bg-blue-50 text-[var(--color-brand-primary)]" : "bg-rose-50 text-rose-500"}`}>{type}</span>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500">来源用户：{opinion.source}</span>
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-700">{opinion.content}</p>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-white/80 bg-white/50 px-4 py-3">
            <p className="text-sm font-semibold leading-6 text-slate-400">暂无{type}点</p>
          </div>
        )}
      </div>
    </td>
  );
}

const MATERIAL_CATEGORY_TABS = ["全部", "表情", "配饰", "服装", "动作", "纹样", "背景"] as const;
type MaterialCategoryTab = typeof MATERIAL_CATEGORY_TABS[number];

function MaterialPreview({ payload }: { payload: AnalysisPayload }) {
  const cards = buildMaterialElementCards(payload);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<MaterialCategoryTab>("全部");
  const visibleCards = cards.filter((item) => !deletedIds.includes(item.id));
  const filteredCards = activeCategory === "全部" ? visibleCards : visibleCards.filter((item) => item.category === activeCategory);
  const generatedMaterialCount = getGeneratedMaterialCount(payload);

  return (
    <div className="space-y-2.5">
      <div className="rounded-[22px] border border-transparent bg-transparent px-3 py-2">
        <p className="text-xs font-semibold leading-5 text-slate-500">
          已生成 {generatedMaterialCount} 个候选素材，将用于后续交互式进化计算。
        </p>
      </div>
      <div className="flex flex-wrap gap-2 rounded-[22px] border border-transparent bg-transparent p-2">
        {MATERIAL_CATEGORY_TABS.map((tab) => {
          const active = activeCategory === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveCategory(tab)}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${active ? "bg-blue-50 text-[var(--color-brand-primary)] ring-1 ring-blue-200/70 shadow-[0_8px_18px_rgba(49,95,232,0.10)]" : "bg-white/60 text-slate-500 hover:bg-white/80 hover:text-[var(--color-brand-primary)]"}`}
            >
              {tab}
            </button>
          );
        })}
      </div>
      {filteredCards.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredCards.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[24px] border border-white/70 bg-white/65 shadow-[0_14px_30px_rgba(49,95,232,0.09)]">
              <div className="relative h-44 overflow-hidden bg-slate-100">
                <img src={item.imageUrl} alt={item.title} className="size-full object-cover" draggable={false} />
                <span className="absolute left-3 top-3 rounded-full bg-white/88 px-3 py-1 text-[11px] font-black text-[var(--color-brand-primary)] shadow-sm">{item.category}</span>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="min-w-0 text-base font-black leading-6 text-slate-900">{item.title}</h4>
                  <button
                    type="button"
                    onClick={() => setDeletedIds((current) => [...current, item.id])}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2.5 text-[11px] font-black text-slate-400 transition hover:bg-blue-50 hover:text-[var(--color-brand-primary)]"
                    aria-label={`删除${item.title}`}
                  >
                    <Trash2 size={13} /> 删除
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-slate-400">来源</span>
                  {item.sources.map((source) => (
                    <span key={source.code} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-[var(--color-brand-primary)]">
                      {source.code} · {source.label}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-500">{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-white/80 bg-white/50 px-5 py-8 text-center text-sm font-semibold text-slate-400">
          {visibleCards.length ? "当前分类暂无素材。" : "当前素材库元素已全部删除。"}
        </div>
      )}
    </div>
  );
}

function getGeneratedMaterialCount(payload: AnalysisPayload) {
  const withMaterialCount = payload as AnalysisPayload & { generatedMaterialCount?: number; materialSummary?: { generatedCount?: number } };
  return withMaterialCount.materialSummary?.generatedCount ?? withMaterialCount.generatedMaterialCount ?? 36;
}

function buildUserSources(items: AnalysisTextSource[]): UserSource[] {
  const sourceLabels = unique(items.map(sourceLabel));
  return (sourceLabels.length ? sourceLabels : ["系统归纳"]).map((label, index) => ({
    code: `用户${index + 1}`,
    label,
  }));
}

function elementVisualDataUrl(label: string, category: string, index: number) {
  const palettes = [
    ["#E8F1FF", "#315FE8", "#8F6DE8"],
    ["#FFF2E8", "#F08A5D", "#315FE8"],
    ["#EFFAF3", "#76B59F", "#5D9DF0"],
    ["#F4F0FF", "#8F6DE8", "#315FE8"],
  ];
  const [bg, primary, accent] = palettes[index % palettes.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${bg}"/>
          <stop offset="1" stop-color="#ffffff"/>
        </linearGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="24"/></filter>
      </defs>
      <rect width="640" height="420" rx="36" fill="url(#g)"/>
      <circle cx="506" cy="96" r="116" fill="${accent}" opacity="0.20" filter="url(#blur)"/>
      <circle cx="124" cy="326" r="132" fill="${primary}" opacity="0.14" filter="url(#blur)"/>
      <rect x="74" y="72" width="492" height="272" rx="32" fill="rgba(255,255,255,0.58)" stroke="rgba(255,255,255,0.82)"/>
      <circle cx="188" cy="198" r="70" fill="#fff8ef" stroke="#716153" stroke-width="5"/>
      <circle cx="165" cy="184" r="7" fill="#333"/>
      <circle cx="211" cy="184" r="7" fill="#333"/>
      <path d="M168 214 Q190 236 214 214" stroke="#d36a37" stroke-width="8" fill="none" stroke-linecap="round"/>
      <rect x="302" y="136" width="184" height="18" rx="9" fill="${primary}" opacity="0.26"/>
      <rect x="302" y="178" width="246" height="18" rx="9" fill="${accent}" opacity="0.24"/>
      <rect x="302" y="220" width="148" height="18" rx="9" fill="${primary}" opacity="0.18"/>
      <text x="320" y="318" font-family="PingFang SC, Arial" font-size="30" font-weight="800" fill="${primary}" text-anchor="middle">${label}</text>
      <text x="320" y="356" font-family="PingFang SC, Arial" font-size="18" font-weight="700" fill="#64748B" text-anchor="middle">${category}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildTraceDimensions(payload: AnalysisPayload): TraceDimension[] {
  return TRACE_DIMENSION_CONFIGS.map((config) => {
    const opinions = payload.textSources
      .filter((item) => config.keywords.some((keyword) => item.content.includes(keyword)))
      .map((item) => ({
        id: `${config.title}-${item.id}`,
        source: sourceLabel(item),
        type: isDivergentOpinion(item.content) ? "分歧" as const : "共识" as const,
        content: item.content,
      }));

    return {
      title: config.title,
      description: config.description,
      opinions,
      consensusUsers: unique(opinions.filter((item) => item.type === "共识").map((item) => item.source)),
      divergentUsers: unique(opinions.filter((item) => item.type === "分歧").map((item) => item.source)),
    };
  });
}

function buildMaterialElementCards(payload: AnalysisPayload): MaterialElementCard[] {
  const mentionedCards = ELEMENT_BLUEPRINTS.map((blueprint, index) => {
    const relatedSources = payload.textSources.filter((item) => blueprint.keywords.some((keyword) => item.content.includes(keyword)));
    return {
      id: `mentioned-${blueprint.category}`,
      title: blueprint.title,
      category: blueprint.category,
      sources: buildUserSources(relatedSources.length ? relatedSources : payload.textSources.slice(0, 1)),
      tags: relatedSources.length ? ["用户提及", blueprint.category, "可生成"] : ["系统补全", blueprint.category, "待确认"],
      imageUrl: elementVisualDataUrl(blueprint.title, blueprint.category, index),
    };
  });

  const extractedCards = payload.imageSources.map((item, index) => ({
    id: `extracted-${item.id}`,
    title: `${item.name || item.id} · 提取元素`,
    category: "图片提取",
    sources: buildUserSources(payload.textSources.slice(0, 2)),
    tags: [item.type, item.culture, "图片处理生成"].filter(Boolean),
    imageUrl: item.url ?? elementVisualDataUrl(item.name || item.id, "图片提取", index + mentionedCards.length),
  }));

  return [...mentionedCards, ...extractedCards];
}

function sourceLabel(item: AnalysisTextSource) {
  return item.speaker || (item.role ? `${item.role}代表` : "参与者");
}

function isDivergentOpinion(content: string) {
  return ["不要", "避免", "普通", "太", "不"].some((keyword) => content.includes(keyword));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
