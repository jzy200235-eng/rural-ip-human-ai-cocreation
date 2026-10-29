import { ArrowLeft, ArrowRight, Check, Loader2, Lock, PenLine, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CrowdSignal, EvolutionNode } from "../types";
import { Button } from "./ui/button";
import { AdaptiveTuningPanel, type TuningSnapshot } from "./AdaptiveTuningPanel";
import { isEvolvedChild, isLocalVariant, usesRichCard } from "../lib/evolutionModel";
import { cn } from "../lib/utils";

interface Props {
  node: EvolutionNode;
  compact?: boolean;
  signal?: CrowdSignal;
  selected?: boolean;
  selectable?: boolean;
  /** 只读锁定：移除「修改 / 确认生成 / 再生成」入口（如群体结果页中已确认的第一轮父代） */
  locked?: boolean;
  groupTotals?: { villagers: number; merchants: number; tourists: number };
  onToggleSelect?: (node: EvolutionNode) => void;
  onModify: (node: EvolutionNode) => void;
  onRegenerate: (node: EvolutionNode) => void;
  onGenerate?: (parent: EvolutionNode, tuning: TuningSnapshot) => void;
}

function ConsensusMeter({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold leading-none text-[var(--color-brand-accent)]">
        <span>大众共识度</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-page)]">
        <div
          className="h-full rounded-full transition-all app-gradient-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

// 精调摘要：替代「大众共识度」，展示用户在「自适应精调」中录入的语义指令与调整后的滑块变量数值
function TuningSummary({ tuning }: { tuning: TuningSnapshot }) {
  return (
    <div className="space-y-2.5">
      {tuning.semantic ? (
        <div className="rounded-xl border border-[var(--color-border-control)] bg-[var(--color-bg-page-soft)] px-3 py-2">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-subtle)]">精调指令</div>
          <p className="text-xs font-semibold leading-5 text-[var(--color-text-default)]">{tuning.semantic}</p>
        </div>
      ) : null}
      {tuning.params.length > 0 ? (
        <div className="space-y-1.5">
          {tuning.params.map((param) => (
            <div key={param.id} className="flex items-center justify-between text-[11px] font-bold leading-none">
              <span className="text-[var(--color-text-muted)]">{param.label}</span>
              <span className="text-[var(--color-brand-accent)]">{param.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type TraceGridItem = {
  title: string;
  description: string;
  consensus: string;
  evidence: string;
  sources: string[];
  keywords: string[];
};

const TRACE_GRID_ITEMS: TraceGridItem[] = [
  { title: "主体造型", description: "角色主体与物种识别", consensus: "鹅 IP 主体", evidence: "保留鹅角色与本地酱鹅识别", sources: ["村民", "商户"], keywords: ["鹅", "酱鹅", "厨师", "形状"] },
  { title: "性格气质", description: "亲和力与情绪设定", consensus: "亲切欢迎", evidence: "阳光、亲和、可爱等人设词", sources: ["游客", "村民"], keywords: ["亲和", "亲切", "阳光", "可爱", "表情"] },
  { title: "风格调性", description: "传播感与年轻化程度", consensus: "轻松可传播", evidence: "贴纸、点赞、试吃摊等场景", sources: ["游客"], keywords: ["卡通", "活泼", "点赞", "贴纸", "传播"] },
  { title: "文化表达", description: "古镇与地方故事", consensus: "文化记忆清晰", evidence: "海窝子、明月村与老手艺线索", sources: ["村民", "手艺人"], keywords: ["海窝子", "明月", "古镇", "本地", "手艺"] },
  { title: "色彩系统", description: "主色与情绪色", consensus: "温暖热闹", evidence: "暖色、红色与喜庆氛围", sources: ["游客", "商户"], keywords: ["颜色", "色彩", "红", "暖", "喜庆"] },
  { title: "图案材质", description: "纹样、材质和装饰", consensus: "材质轻量介入", evidence: "围裙、竹编、招牌等转译", sources: ["商户", "手艺人"], keywords: ["围裙", "竹编", "图案", "材质", "招牌"] },
  { title: "局部元素", description: "动作、配饰与道具", consensus: "高价值细节", evidence: "厨师帽、汤碗、蒸笼、托盘", sources: ["商户", "游客"], keywords: ["帽", "托盘", "锅", "碗", "蒸笼", "动作"] },
  { title: "约束禁忌", description: "误读风险与边界", consensus: "避免堆砌", evidence: "不过度卡通、不普通鸭化", sources: ["村民", "游客"], keywords: ["不要", "避免", "太", "复杂", "土气"] },
];

function buildTraceGrid(node: EvolutionNode, keywords: string[] = []): Array<TraceGridItem & { selected: boolean; score: number }> {
  const text = [node.candidate.title, node.candidate.directionName, node.candidate.tagline, node.candidate.description, ...keywords, ...(node.candidate.promptTrace ?? [])]
    .filter(Boolean)
    .join(" ");
  const baseConsensus = node.candidate.consensus ?? 62;
  return TRACE_GRID_ITEMS.map((item, index) => {
    const matchCount = item.keywords.filter((keyword) => text.includes(keyword)).length;
    const selected = matchCount > 0;
    const rawScore = selected ? baseConsensus - 12 + matchCount * 9 : 16 + index * 4;
    return {
      ...item,
      selected,
      score: Math.max(12, Math.min(92, rawScore)),
    };
  });
}

function purpleHeatStyle(score: number) {
  const lightnessA = Math.round(98 - score * 0.2);
  const lightnessB = Math.round(95 - score * 0.22);
  return {
    background: `linear-gradient(180deg, hsl(236 76% ${lightnessA}%), hsl(255 62% ${lightnessB}%))`,
    color: "#25314f",
  };
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function CandidateCard({ node, compact, signal, selected, selectable, locked, groupTotals, onToggleSelect, onModify, onRegenerate, onGenerate }: Props) {
  const isSelected = selected ?? node.selected;
  const [tuningOpen, setTuningOpen] = useState(false);
  // 确认生成流程：idle 未触发 / loading 生成动效中
  const [genStatus, setGenStatus] = useState<"idle" | "loading">("idle");
  // 当前卡片在「自适应精调」中录入的语义描述与滑块变量数值
  const [tuning, setTuning] = useState<TuningSnapshot>({ semantic: "", params: [] });
  const [traceOpen, setTraceOpen] = useState(false);
  // gen-0 初始方案 与 派生节点（局部调整 / 进化子代）均使用富卡片，且拥有完整的「修改 → 确认生成」流程
  const rich = !compact && usesRichCard(node);
  const evolvedChild = isEvolvedChild(node);
  const firstGenerationParent = node.generation === 0 && !isLocalVariant(node);
  // 仅在 group-feedback 的只读结果页中启用父/子层级视觉；workspace 保持默认方案卡片状态。
  const readonlyParent = Boolean(locked && firstGenerationParent);
  const readonlyChild = Boolean(locked && evolvedChild);

  const confirmGenerate = () => {
    setTuningOpen(false);
    setGenStatus("loading");
    const snapshot = tuning;
    // 展示生成加载动效后，向画布提交一个位置独立的新精调节点
    window.setTimeout(() => {
      onGenerate?.(node, snapshot);
      setGenStatus("idle");
      setTuning({ semantic: "", params: [] });
    }, 1800);
  };
  const { directionCode, directionName, tagline, keywords, consensus } = node.candidate;
  const traceGrid = buildTraceGrid(node, keywords);
  const signalTags = signal?.tags ?? [];
  const groupScoreRows = signal && groupTotals ? [
    { label: "村民", votes: signal.villagerVotes, total: groupTotals.villagers, score: percent(signal.villagerVotes, groupTotals.villagers), tags: signalTags.slice(0, 2) },
    { label: "游客", votes: signal.touristVotes, total: groupTotals.tourists, score: percent(signal.touristVotes, groupTotals.tourists), tags: signalTags.slice(1, 3) },
    { label: "商户", votes: signal.merchantVotes, total: groupTotals.merchants, score: percent(signal.merchantVotes, groupTotals.merchants), tags: signalTags.length > 2 ? [signalTags[0], signalTags[2]] : signalTags.slice(0, 2) },
  ] : [];

  const selectionToggle = selectable ? (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggleSelect?.(node);
      }}
      aria-label={isSelected ? "取消选择该方案" : "选择该方案"}
      className={cn(
        "absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-lg border-2 transition",
        isSelected
          ? "border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)] text-white"
          : "border-slate-300 bg-white/90 text-transparent hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]",
      )}
    >
      <Check size={16} />
    </button>
  ) : null;

  if (rich) {
    return (
      <div className="group/card w-[288px] [perspective:1200px] transition-transform duration-200 ease-out hover:-translate-y-1">
        <motion.div
          className="relative min-h-[416px] [transform-style:preserve-3d]"
          animate={{ rotateY: traceOpen ? 180 : 0 }}
          transition={{ duration: 0.46, ease: [0.22, 0.61, 0.36, 1] }}
        >
        {/* 方案卡片本体：workspace 保持默认；group-feedback 中父代用柔和遮罩降权，子代提亮发光形成层级对比 */}
        <div
          className={cn(
            "glass-card relative overflow-hidden rounded-[24px] border-2 p-3.5 transition-[background-color,border-color,box-shadow,filter,opacity,transform] duration-200 ease-out [backface-visibility:hidden]", 
            readonlyParent && "border-white/75 bg-white/58 shadow-[0_18px_46px_rgba(74,100,160,0.10)] backdrop-blur-2xl ring-1 ring-white/55 after:pointer-events-none after:absolute after:inset-0 after:rounded-[22px] after:bg-[radial-gradient(circle_at_24%_8%,rgba(255,255,255,0.86),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.42),rgba(232,238,255,0.16)_52%,rgba(255,255,255,0.20))] after:content-[''] group-hover/card:bg-white/66 group-hover/card:shadow-[0_22px_54px_rgba(74,100,160,0.15)]",
            readonlyChild && "border-solid border-white/80 bg-white/62 shadow-[0_0_0_1px_rgba(255,255,255,0.78),0_22px_56px_rgba(74,100,160,0.18),0_0_42px_rgba(130,111,255,0.14)] backdrop-blur-2xl ring-1 ring-[color-mix(in_srgb,var(--color-brand-accent)_14%,transparent)] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[22px] before:bg-[radial-gradient(circle_at_24%_8%,rgba(255,255,255,0.92),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.54),rgba(236,240,255,0.24)_48%,rgba(255,255,255,0.26))] before:opacity-80 before:transition-opacity before:content-[''] group-hover/card:border-[color-mix(in_srgb,var(--color-brand-accent)_36%,white)] group-hover/card:bg-white/72 group-hover/card:shadow-[0_0_0_1px_rgba(255,255,255,0.88),0_28px_64px_rgba(74,100,160,0.23),0_0_52px_rgba(130,111,255,0.20)] group-hover/card:before:opacity-100",
            !readonlyParent && !readonlyChild && "border-[var(--color-border-control)]",
            isSelected && "border-[var(--color-brand-accent)] bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.88),0_24px_58px_rgba(74,100,160,0.26),0_0_46px_rgba(130,111,255,0.24)] ring-4 ring-[color-mix(in_srgb,var(--color-brand-accent)_24%,transparent)] brightness-[1.05]",
          )}
        >
          {selectionToggle}
          {!selectable && isSelected ? (
            <div className="absolute -left-3 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-white shadow">
              <Check size={18} />
            </div>
          ) : null}

          {/* 头部：编号徽标 + 类型名称 + 查看详情同行 */}
          <div className="relative z-10 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl app-gradient-primary text-base font-black leading-none text-white shadow">
              {directionCode ?? node.candidate.title}
            </span>
            <h4 className="min-w-0 flex-1 truncate text-[15px] font-black leading-tight text-[var(--color-text-strong)]">
              {directionName ?? node.candidate.title}
            </h4>
            <button
              type="button"
              className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-brand-accent)_22%,transparent)] bg-white/82 px-2.5 text-[10px] font-black leading-none text-[var(--color-brand-accent)] shadow-[0_8px_18px_rgba(74,100,160,0.10)] backdrop-blur-xl transition hover:border-[color-mix(in_srgb,var(--color-brand-accent)_42%,transparent)] hover:bg-white"
              onClick={(event) => {
                event.stopPropagation();
                setTraceOpen(true);
              }}
            >
              <span>查看详情</span>
              <ArrowRight size={11} />
            </button>
          </div>

          {/* 同轮局部调整徽标：明确该卡片仍归属当前轮，是局部微调而非新一轮方案 */}
          {isLocalVariant(node) ? (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-brand-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-accent)_10%,transparent)] px-2.5 py-1 text-[10px] font-black leading-none text-[var(--color-brand-accent)]">
              本轮局部调整
            </div>
          ) : null}

          {/* 缩略图：放大为方案主体 */}
          <div className="relative mt-3">
            <img
              src={node.candidate.imageUrl}
              alt={node.candidate.title}
              className={cn(
                "relative z-10 aspect-square w-full rounded-2xl bg-[var(--color-bg-page-soft)] object-cover transition-[filter,opacity,transform] duration-200 ease-out group-hover/card:scale-[1.015]",
                readonlyParent && "opacity-[0.9] saturate-[0.96] brightness-[1.03] contrast-[1.02]",
                readonlyChild && "brightness-[1.08] contrast-[1.03] group-hover/card:brightness-[1.15]",
              )}
            />
          </div>

          {/* 一句话说明 */}
          <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            {tagline ?? node.candidate.description}
          </p>

          {/* 关键词标签 */}
          {(keywords ?? []).length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(keywords ?? []).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-[var(--color-border-control)] bg-[var(--color-bg-page-soft)] px-2.5 py-1 text-[11px] font-bold leading-none text-[var(--color-text-muted)]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}

          {/* 指标区：初始方案展示「大众共识度」；精调节点展示其精调摘要（指令 + 滑块数值） */}
          <div className="mt-3.5">
            {node.tuning ? <TuningSummary tuning={node.tuning} /> : <ConsensusMeter value={consensus ?? 0} />}
          </div>

          {/* 操作区：只读锁定时移除「修改」入口——父代展示锁定标识、子代展示「群体进化」标识，轮次归属一目了然 */}
          {locked ? (
            node.generation === 0 ? (
              <div className="mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border-control)] bg-[var(--color-bg-page-soft)] text-xs font-black leading-none text-[var(--color-text-muted)]">
                <Lock size={13} />
                <span className="leading-none">第一轮父代 · 已锁定</span>
              </div>
            ) : evolvedChild ? (
              <div className="mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-brand-accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-accent)_10%,transparent)] text-xs font-black leading-none text-[var(--color-brand-accent)]">
                <Sparkles size={13} />
                <span className="leading-none">第二轮子代 · 群体进化</span>
              </div>
            ) : null
          ) : (
            <Button
              variant="gradient"
              size="sm"
              className="mt-3.5 h-9 w-full gap-1 rounded-xl text-xs"
              onClick={() => (tuningOpen ? confirmGenerate() : setTuningOpen(true))}
            >
              {tuningOpen ? <Sparkles size={13} /> : <PenLine size={13} />}
              <span className="leading-none">{tuningOpen ? "确认生成" : "修改"}</span>
            </Button>
          )}
        </div>

        <div className="glass-card absolute inset-0 overflow-hidden rounded-[24px] border border-[#dfe6ff] bg-[#f8faff] p-3.5 shadow-[0_18px_42px_rgba(72,94,154,0.12)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className={cn("flex items-start border-b border-[#e4e9fb] pb-3", readonlyChild ? "justify-end" : "justify-between gap-3")}>
            {readonlyChild ? null : (
              <p className="text-[10px] font-semibold leading-4 text-[#7480a6]">色块深浅表示八个溯源维度对当前方案生成的共识支撑强度；标签展示主要意见来源。</p>
            )}
            <button
              type="button"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-[#dce4ff] bg-white/86 px-2.5 text-[10px] font-black leading-none text-[#4f63a9] shadow-[0_8px_18px_rgba(72,94,154,0.08)] transition hover:bg-white"
              onClick={(event) => {
                event.stopPropagation();
                setTraceOpen(false);
              }}
            >
              <ArrowLeft size={11} />
              <span>返回</span>
            </button>
          </div>

          {readonlyChild ? (
            <div className="mt-3 space-y-3">
              <div className="p-0">
                <div className="mb-2 flex items-center justify-between text-[10px] font-black leading-none text-[#4f63a9]">
                  <span>群体评分详情</span>
                  <span>{signal?.totalVotes ?? 0} 票</span>
                </div>
                <div className="space-y-3">
                  {groupScoreRows.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-[10px] font-bold leading-none text-[#53638d]">
                        <span>{row.label}</span>
                        <span>{row.score}% · {row.votes}/{row.total}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#edf2ff]">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#9fb8ff,#8d7cf2)]" style={{ width: `${row.score}%` }} />
                      </div>
                      {row.tags.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {row.tags.map((tag) => (
                            <span key={`${row.label}-${tag.label}`} className="rounded-full bg-[#f3f6ff] px-2 py-1 text-[9px] font-black leading-none text-[#4f63a9] shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">
                              {tag.label} · {tag.count}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-none bg-[#eef2ff] shadow-[0_12px_28px_rgba(72,94,154,0.12)] ring-1 ring-[#dfe6ff]">
              <div className="grid h-10 grid-cols-[auto_1fr_auto] items-center gap-2 bg-white/76 px-3 text-[9px] font-black leading-none text-[#54628c]">
                <span>低 0%</span>
                <div className="relative h-2 rounded-none bg-[linear-gradient(90deg,hsl(236_76%_95%),hsl(255_62%_75%))]">
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[8px] text-[#7b86aa]">颜色越深，共识度越高</span>
                </div>
                <span>高 100%</span>
              </div>
              <div className="grid grid-cols-2 gap-0 rounded-none">
                {traceGrid.map((item) => (
                  <div
                    key={item.title}
                    className="min-h-[72px] rounded-none px-3 py-2.5 transition hover:brightness-[1.03]"
                    style={purpleHeatStyle(item.score)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="max-w-[92px] truncate text-[11px] font-black leading-none text-[#263452]">{item.title}</span>
                      <span className="text-[14px] font-black leading-none tracking-[-0.03em] text-[#34446d]">{item.score}%</span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[10px] font-black leading-4 text-[#35466f]">{item.consensus}</p>
                    <p className="line-clamp-1 text-[10px] font-semibold leading-4 text-[#526087]">{item.evidence}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.sources.map((source) => (
                        <span key={source} className="bg-white/42 px-1.5 py-0.5 text-[8px] font-black leading-none text-[#40527d] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32)]">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        </motion.div>

        {/* 自适应精调：独立浮层，与方案卡片保留明显间距与边界，不连为一体 */}
        {!locked && tuningOpen ? (
          <div className="mt-4">
            <AdaptiveTuningPanel embedded onChange={setTuning} />
          </div>
        ) : null}

        {/* 确认生成中：虚线连接 + 加载动效占位（生成完成后由画布渲染一张位置独立的新精调卡片） */}
        <AnimatePresence>
          {genStatus === "loading" ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="flex justify-center" aria-hidden>
                <span className="my-1 h-7 w-0 border-l-2 border-dashed border-[var(--color-brand-accent)]" />
              </div>
              <div className="glass-card flex flex-col items-center gap-3 rounded-[22px] border-2 border-dashed border-[color-mix(in_srgb,var(--color-brand-accent)_55%,transparent)] p-4">
                {/* 生成占位：脉冲加载动效 */}
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-gradient-to-br from-[var(--color-bg-page-soft)] via-white/70 to-[var(--color-bg-page-soft)]" />
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-brand-accent)]">
                  <Loader2 size={15} className="animate-spin" />
                  AI 正在生成精调方案…
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-[148px] rounded-[22px] border-[4px] border-[var(--color-border-control)] p-3 transition-colors",
        // 工作台画布中的非富卡片（演化子节点）：维持原白底卡片观感
        !compact && "bg-white/90 shadow-[0_12px_24px_rgba(74,135,255,0.18)]",
        isSelected && "border-[var(--color-brand-accent)]",
        // group-feedback 结果页（compact）：外观对齐工作台玻璃富卡片——磨砂底色/卡片阴影、24 圆角、2px 边框、p-3.5 内边距；尺寸仍保持紧凑以容纳树状布局
        compact && "glass-card w-[150px] rounded-[24px] border-2 p-3.5",
      )}
    >
      {selectionToggle}
      {!selectable && isSelected ? (
        <div className="absolute -left-3 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-white shadow">
          <Check size={18} />
        </div>
      ) : null}
      <img src={node.candidate.imageUrl} alt={node.candidate.title} className="aspect-square w-full rounded-2xl bg-[var(--color-bg-page-soft)] object-cover" />
      {locked ? null : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="gradient" size="sm" className="h-8 min-w-0 gap-1 rounded-xl px-2 text-xs" onClick={() => onModify(node)}>
            <PenLine size={13} />
            <span className="leading-none">修改</span>
          </Button>
          <Button variant="gradient" size="sm" className="h-8 min-w-0 gap-1 rounded-xl px-2 text-xs" onClick={() => onRegenerate(node)}>
            <RotateCcw size={13} />
            <span className="leading-none">再生成</span>
          </Button>
        </div>
      )}
      {signal ? (
        <div className="mt-4 border-t border-[var(--color-border-control)] pt-4">
          <div className="flex justify-between text-base font-bold text-[var(--color-text-default)]">
            <span>总票数:</span>
            <span className="text-[var(--color-brand-primary)]">{signal.totalVotes}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center text-sm font-bold">
            <div className="rounded-lg bg-green-50 p-2 text-green-700">👩‍🌾<br />{signal.villagerVotes}</div>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">💼<br />{signal.merchantVotes}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {signal.tags.slice(0, 2).map((tag) => (
              <span key={tag.label} className="rounded-full bg-purple-100 px-3 py-2 text-center text-sm font-bold leading-tight text-purple-700">
                {tag.label}<br />({tag.count})
              </span>
            ))}
            <button className="rounded-full bg-purple-50 px-4 py-2 text-sm font-bold text-purple-600">more</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
