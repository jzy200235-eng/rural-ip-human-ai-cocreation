import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { evolutionVariants, initialEvolutionWeights } from "../data/evolutionMockData";
import { readInteractiveEvolutionSourcePlans, type InteractiveEvolutionSourcePlan } from "../lib/interactiveEvolutionSelection";
import { saveMobileFinalContribution } from "../lib/mobileFinalContribution";
import { getNextVariant } from "../services/evolutionService";
import type { DesignDimension, DesignTag, DesignVariant, EvolutionAction, EvolutionState, InteractionRecord } from "../types/evolution";

const dimensionLabels: Record<DesignDimension, string> = {
  shape: "形态",
  color: "颜色",
  style: "风格",
  material: "材质",
  accessory: "配饰",
  expression: "表情",
  action: "动作",
  background: "背景",
};

const actionMeta: Record<EvolutionAction, { label: string; prompt: string; tone: string }> = {
  like: {
    label: "喜欢",
    prompt: "哪些地方让你喜欢？",
    tone: "from-emerald-400 to-teal-500 text-white shadow-[0_14px_28px_rgba(20,184,166,0.24)]",
  },
  unsure: {
    label: "不确定",
    prompt: "哪些地方还拿不准？",
    tone: "from-amber-300 to-orange-400 text-white shadow-[0_14px_28px_rgba(251,146,60,0.22)]",
  },
  dislike: {
    label: "不喜欢",
    prompt: "哪些地方需要减弱？",
    tone: "from-rose-400 to-pink-500 text-white shadow-[0_14px_28px_rgba(244,63,94,0.22)]",
  },
};

const tagDimensions: DesignDimension[] = ["shape", "color", "style", "material", "accessory", "expression", "action", "background"];

function makeTagId(text: string, index: number) {
  return `${text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")}-${index}`;
}

function tagsFromPlan(plan: InteractiveEvolutionSourcePlan, planIndex: number): DesignTag[] {
  const keywords = plan.keywords?.length ? plan.keywords : [plan.title, "亲切", "活泼", "圆润", "本地识别"];
  return keywords.slice(0, 5).map((keyword, keywordIndex) => ({
    id: makeTagId(`${plan.id}-${keyword}`, keywordIndex),
    label: keyword,
    dimension: tagDimensions[(planIndex + keywordIndex) % tagDimensions.length],
    weight: Math.min(95, Math.max(35, (plan.consensus ?? 62) + keywordIndex * 3 - 6)),
  }));
}

function buildInteractiveVariants(): DesignVariant[] {
  const sourcePlans = readInteractiveEvolutionSourcePlans();
  if (!sourcePlans.length) return evolutionVariants;

  return sourcePlans.flatMap((plan, planIndex) => {
    const sourceTags = tagsFromPlan(plan, planIndex);
    const fallback = evolutionVariants[planIndex % evolutionVariants.length];
    const mutationA = evolutionVariants[(planIndex + 3) % evolutionVariants.length];
    const mutationB = evolutionVariants[(planIndex + 7) % evolutionVariants.length];
    const imageUrl = plan.imageUrl || fallback.imageUrl;
    const description = plan.description || "由工作台已选方案进入手机端交互式进化演示。";

    return [
      {
        id: `source-${plan.id}`,
        title: `${plan.title} · 原始选择`,
        imageUrl,
        tags: sourceTags,
        description,
      },
      {
        id: `mutated-${plan.id}-layout`,
        title: `${plan.title} · 形态重排`,
        imageUrl: mutationA.imageUrl,
        tags: [...sourceTags.slice(1), sourceTags[0]].filter(Boolean),
        description: `基于「${plan.title}」保留核心标签，并重新排列形态、动作与视觉节奏。`,
      },
      {
        id: `mutated-${plan.id}-mix`,
        title: `${plan.title} · 偏好变异`,
        imageUrl: mutationB.imageUrl,
        tags: sourceTags.map((tag, index) => ({ ...tag, weight: Math.min(100, tag.weight + 4 + index * 2) })),
        description: `基于「${plan.title}」模拟强化高偏好标签后的下一代候选。`,
      },
    ];
  });
}

function buildInitialWeights(variants: DesignVariant[]) {
  const weights = { ...initialEvolutionWeights };
  variants.flatMap((variant) => variant.tags).forEach((tag) => {
    weights[tag.id] = tag.weight;
  });
  return weights;
}

export function InteractiveEvolutionDemo() {
  const variants = useMemo(() => buildInteractiveVariants(), []);
  const startingWeights = useMemo(() => buildInitialWeights(variants), [variants]);
  const usesSelectedPlans = variants !== evolutionVariants;
  const [state, setState] = useState<EvolutionState>({
    currentRound: 2,
    maxRound: 12,
    currentDesign: variants[0],
    selectedTagIds: [],
    weights: startingWeights,
    records: [],
  });
  const [expandedTuning, setExpandedTuning] = useState(false);
  const [semanticInput, setSemanticInput] = useState("");
  const [finished, setFinished] = useState(false);
  const [pendingAction, setPendingAction] = useState<EvolutionAction | null>(null);

  const progress = Math.min(100, (state.currentRound / state.maxRound) * 100);
  const selectedTags = state.currentDesign.tags.filter((tag) => state.selectedTagIds.includes(tag.id));
  const title = state.feedbackText?.startsWith("已减弱")
    ? `已去掉【${selectedTags[0]?.label ?? "部分特征"}】，您是否喜欢当前方案？`
    : "您是否喜欢当前方案？";

  const topWeights = useMemo(
    () =>
      state.currentDesign.tags
        .map((tag) => ({ ...tag, currentWeight: state.weights[tag.id] ?? tag.weight }))
        .sort((a, b) => b.currentWeight - a.currentWeight),
    [state.currentDesign.tags, state.weights],
  );

  const toggleTag = (id: string) => {
    setState((current) => ({
      ...current,
      selectedTagIds: current.selectedTagIds.includes(id)
        ? current.selectedTagIds.filter((item) => item !== id)
        : [...current.selectedTagIds, id],
    }));
  };

  const chooseAction = (action: EvolutionAction) => {
    setPendingAction(action);
    setState((current) => ({ ...current, selectedTagIds: [] }));
  };

  const act = (action: EvolutionAction) => {
    const beforeWeights = { ...state.weights };
    const result = getNextVariant({
      currentDesignId: state.currentDesign.id,
      selectedTags: state.selectedTagIds,
      action,
      currentWeights: state.weights,
      currentRound: state.currentRound,
      variants,
    });

    const record: InteractionRecord = {
      round: state.currentRound,
      designId: state.currentDesign.id,
      selectedTagIds: state.selectedTagIds,
      action,
      beforeWeights,
      afterWeights: result.nextWeights,
      feedbackText: result.feedbackText,
      timestamp: Date.now(),
    };

    const nextRound = state.currentRound + 1;
    setState((current) => ({
      ...current,
      currentRound: nextRound,
      currentDesign: result.nextDesign,
      selectedTagIds: [],
      weights: result.nextWeights,
      records: [...current.records, record],
      feedbackText: result.feedbackText,
    }));
    setPendingAction(null);

    if (nextRound > state.maxRound) {
      const nextRecords = [...state.records, record];
      const nextTopWeights = result.nextDesign.tags
        .map((tag) => ({ label: tag.label, weight: result.nextWeights[tag.id] ?? tag.weight }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);
      const actionCounts = nextRecords.reduce<Record<EvolutionAction, number>>(
        (acc, item) => ({ ...acc, [item.action]: (acc[item.action] ?? 0) + 1 }),
        { like: 0, unsure: 0, dislike: 0 },
      );
      saveMobileFinalContribution({
        preferredTags: nextTopWeights,
        actionCounts,
        totalRounds: nextRecords.length,
        finalDesignTitle: result.nextDesign.title,
      });
      setFinished(true);
    }
  };

  const reset = () => {
    setFinished(false);
    setState({
      currentRound: 2,
      maxRound: 12,
      currentDesign: variants[0],
      selectedTagIds: [],
      weights: startingWeights,
      records: [],
    });
    setSemanticInput("");
    setPendingAction(null);
  };

  const tune = () => {
    if (!semanticInput.trim()) return;
    setState((current) => ({
      ...current,
      weights: {
        ...current.weights,
        lively: Math.min(100, (current.weights.lively ?? 50) + 7),
        expression: Math.min(100, (current.weights.expression ?? 50) + 5),
        warm: Math.min(100, (current.weights.warm ?? 50) + 4),
      },
      feedbackText: `已根据“${semanticInput.trim()}”调整活泼、表情和暖色权重`,
    }));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(142,126,255,0.26),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(77,132,255,0.22),transparent_30%),linear-gradient(135deg,#eaf3ff_0%,#f5f0ff_52%,#eef7ff_100%)] px-4 py-7">
      <div className="pointer-events-none absolute inset-x-10 top-8 h-28 rounded-full bg-white/42 blur-3xl" />
      <section className="relative mx-auto flex min-h-[860px] w-full max-w-[430px] flex-col overflow-hidden rounded-[36px] border border-white/70 bg-white/34 shadow-[0_26px_80px_rgba(83,89,178,0.22)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/52 via-white/18 to-violet-200/22" />
        {!finished ? (
          <div className="relative flex min-h-[860px] flex-col">
            <div className="px-6 pt-6">
              <div className="rounded-[24px] border border-white/65 bg-white/38 px-4 py-3 text-xs font-bold leading-5 text-[#315FE8] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl">
                {usesSelectedPlans ? "当前为基于工作台所选方案生成的前端演示变异序列，后续可接入后端交互式进化算法。" : "当前为默认前端演示序列，后续可接入后端交互式进化算法。"}
              </div>
              <div className="mb-2 mt-5 flex items-center justify-between text-sm font-black text-slate-700">
                <span>进度</span>
                <span className="rounded-full bg-white/48 px-3 py-1 text-[#315FE8]">{Math.min(state.currentRound, state.maxRound)} / {state.maxRound}</span>
              </div>
              <div className="h-2 rounded-full bg-white/52 shadow-inner">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#315FE8] via-[#6F8FF5] to-[#9A6CF0] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex-1 px-6 pb-5 pt-7">
              <h1 className="min-h-[60px] text-center text-[24px] font-black leading-8 text-slate-950">{title}</h1>
              <div className="mt-4 rounded-[30px] border border-white/70 bg-white/34 p-3 shadow-[0_18px_44px_rgba(94,108,190,0.17)] backdrop-blur-xl">
                <div className="rounded-[24px] bg-gradient-to-br from-white/55 to-blue-100/36 p-3">
                  <img src={state.currentDesign.imageUrl} alt={state.currentDesign.title} className="aspect-square w-full rounded-[22px] object-cover shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]" />
                </div>
              </div>

              {state.feedbackText ? (
                <div className="mx-auto mt-4 w-fit rounded-full border border-white/70 bg-white/46 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm backdrop-blur-xl">{state.feedbackText}</div>
              ) : null}

              <div className="mt-5 grid grid-cols-3 gap-2">
                {(Object.keys(actionMeta) as EvolutionAction[]).map((action) => {
                  const active = pendingAction === action;
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => chooseAction(action)}
                      className={`h-12 rounded-2xl border text-sm font-black transition active:scale-[0.98] ${
                        active
                          ? `border-transparent bg-gradient-to-r ${actionMeta[action].tone}`
                          : "border-white/65 bg-white/42 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl"
                      }`}
                    >
                      {actionMeta[action].label}
                    </button>
                  );
                })}
              </div>

              {pendingAction ? (
                <section className="mt-4 rounded-[26px] border border-white/70 bg-white/42 p-4 shadow-[0_16px_36px_rgba(90,88,170,0.14)] backdrop-blur-xl">
                  <div className="text-center text-sm font-black text-slate-800">{actionMeta[pendingAction].prompt}</div>
                  <p className="mt-1 text-center text-xs font-semibold text-slate-500">选择 1 个或多个原因后提交，也可以直接提交整体判断。</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {state.currentDesign.tags.map((tag) => {
                      const selected = state.selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                            selected
                              ? "border-transparent bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] text-white shadow-[0_10px_22px_rgba(79,111,232,0.24)]"
                              : "border-white/70 bg-white/48 text-slate-600 shadow-sm"
                          }`}
                        >
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => act(pendingAction)}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] text-sm font-black text-white shadow-[0_16px_34px_rgba(79,111,232,0.26)] transition active:scale-[0.99]"
                  >
                    提交并生成下一版
                  </button>
                </section>
              ) : (
                <div className="mt-4 rounded-[24px] border border-dashed border-white/70 bg-white/24 px-4 py-5 text-center text-sm font-bold leading-6 text-slate-500 backdrop-blur-xl">
                  先选择喜欢、不确定或不喜欢，再补充原因标签。
                </div>
              )}

              <section className="mt-5 rounded-[24px] border border-white/70 bg-white/34 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
                <button className="flex w-full items-center justify-between text-left font-black text-slate-800" onClick={() => setExpandedTuning((value) => !value)}>
                  <span className="flex items-center gap-2"><SlidersHorizontal size={18} />自适应精调</span>
                  {expandedTuning ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedTuning ? (
                  <div className="mt-4">
                    <input
                      value={semanticInput}
                      onChange={(event) => setSemanticInput(event.target.value)}
                      placeholder="例如：更活泼、更亲切"
                      className="h-12 w-full rounded-2xl border border-white/70 bg-white/56 px-4 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#8F6DE8]"
                    />
                    <button onClick={tune} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] font-black text-white shadow-[0_14px_30px_rgba(79,111,232,0.22)]">
                      <Sparkles size={17} />生成自适应滑块
                    </button>
                    <div className="mt-4 space-y-4">
                      {topWeights.slice(0, 3).map((item) => (
                        <label key={item.id} className="block">
                          <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
                            <span>{dimensionLabels[item.dimension]} · {item.label}</span>
                            <span className="text-[#7B61FF]">{item.currentWeight}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={item.currentWeight}
                            onChange={(event) =>
                              setState((current) => ({
                                ...current,
                                weights: { ...current.weights, [item.id]: Number(event.target.value) },
                              }))
                            }
                            className="w-full accent-[#8F6DE8]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        ) : (
          <ResultView topWeights={topWeights} onReset={reset} />
        )}
      </section>

      {import.meta.env.DEV ? <DebugPanel state={state} /> : null}
    </main>
  );
}

function ResultView({
  topWeights,
  onReset,
}: {
  topWeights: Array<{ id: string; label: string; dimension: DesignDimension; currentWeight: number }>;
  onReset: () => void;
}) {
  const preferredTags = topWeights.slice(0, 3).map((item) => item.label);
  const primaryPreference = preferredTags.length ? preferredTags.join("、") : "当前方案的整体气质";
  const topFiveWeights = topWeights.slice(0, 5);

  return (
    <div className="relative flex flex-1 flex-col px-7 py-8">
      <div className="mx-auto rounded-full border border-white/70 bg-white/48 px-4 py-2 text-xs font-black text-[#315FE8] shadow-sm backdrop-blur-xl">
        已完成本轮共创反馈
      </div>
      <h1 className="mt-4 text-center text-2xl font-black text-slate-950">感谢参与</h1>
      <p className="mt-3 text-center text-sm font-semibold leading-6 text-slate-500">您的选择已经记录，并将进入本轮群体偏好汇总。</p>

      <div className="mt-6 rounded-[26px] border border-white/70 bg-white/42 p-4 shadow-[0_16px_36px_rgba(90,88,170,0.14)] backdrop-blur-xl">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">倾向摘要</div>
        <div className="mt-3 rounded-[22px] bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] px-4 py-4 text-white shadow-[0_16px_34px_rgba(79,111,232,0.23)]">
          <div className="text-sm font-semibold opacity-90">您更倾向于</div>
          <div className="mt-1 text-xl font-black leading-7">{primaryPreference}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {preferredTags.map((tag, index) => (
            <div key={tag} className="rounded-2xl border border-white/70 bg-white/50 px-3 py-3 text-center shadow-sm">
              <div className="mx-auto flex size-7 items-center justify-center rounded-full bg-[#315FE8] text-xs font-black text-white">{index + 1}</div>
              <div className="mt-2 truncate text-sm font-black text-slate-700">{tag}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-[24px] border border-white/70 bg-white/36 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-xl">
        {[
          ["已记录", "个人偏好"],
          ["进入", "群体汇总"],
          ["用于", "候选生成"],
        ].map(([label, value]) => (
          <div key={value} className="rounded-2xl bg-white/48 px-2 py-3 text-center">
            <div className="text-[11px] font-black text-[#315FE8]">{label}</div>
            <div className="mt-1 text-xs font-black text-slate-700">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-slate-400">偏好权重表</div>
      <div className="mt-3 space-y-3">
        {topFiveWeights.map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/70 bg-white/42 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex justify-between text-sm font-bold text-slate-700">
              <span>{item.label}</span>
              <span className="text-[#7B61FF]">{item.currentWeight}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/65">
              <div className="h-2 rounded-full bg-gradient-to-r from-[#315FE8] to-[#8F6DE8]" style={{ width: `${item.currentWeight}%` }} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={onReset} className="mt-auto flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] font-black text-white shadow-[0_16px_34px_rgba(79,111,232,0.26)]">
        <RotateCcw size={18} />再体验一轮
      </button>
    </div>
  );
}

function DebugPanel({ state }: { state: EvolutionState }) {
  return (
    <details className="mx-auto mt-5 max-w-[430px] rounded-2xl bg-white/80 p-4 text-xs text-slate-500">
      <summary className="cursor-pointer font-bold text-slate-700">开发调试状态</summary>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap">{JSON.stringify(state, null, 2)}</pre>
    </details>
  );
}
