import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, FileImage, Layers3, MessageSquare, UploadCloud, X } from "lucide-react";
import {
  childEdges,
  childNodes,
  crowdSignals,
  initialNodes,
  materials,
  opinions,
  projectInfo,
  roundConfig,
  roundResult,
} from "./data/mockData";
import type { EvolutionEdge, EvolutionNode, MaterialItem, RoundConfig, StageKey, StageStatus } from "./types";
import { TopStageBar } from "./components/TopStageBar";
import { UploadStage } from "./components/UploadStage";
import { EvolutionCanvas } from "./components/EvolutionCanvas";
import { RoundManagementPanel } from "./components/RoundManagementPanel";
import { FinalResultView } from "./components/FinalResultView";
import { WorkflowStepper } from "./components/WorkflowStepper";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { InteractiveEvolutionDemo } from "./pages/InteractiveEvolutionDemo";
import { AnalysisPreviewPage } from "./pages/AnalysisPreviewPage";
import { MobileFeedbackPage, MobileFeedbackSimulator } from "./pages/MobileFeedbackPage";
import { FourthRoundFeedbackPage, GroupFeedbackPage, ThirdRoundFeedbackPage } from "./pages/GroupFeedbackPage";
import { ANALYSIS_PREVIEW_STORAGE_KEY, type AnalysisPayload } from "./lib/analysisPreview";
import { defaultFeedbackConfig, type FeedbackConfig } from "./lib/mobileFeedbackConfig";
import { WORKSPACE_UI_VERSION, clearWorkspaceState, loadWorkspaceState, saveWorkspaceState, type StageCanvasSnapshot, type WorkspaceRoundState } from "./lib/workspaceState";
import { clearFinalSelection, readFinalSelectionRecord, saveFinalSelection } from "./lib/finalSelection";
import { isSelectableParent } from "./lib/evolutionModel";
import { readMobileFinalContribution } from "./lib/mobileFinalContribution";

type LibraryElement = {
  id: string;
  title: string;
  category: string;
  source: string;
  description: string;
  usage: string;
  tags: string[];
  imageUrl?: string;
};

const ELEMENT_LIBRARY: LibraryElement[] = [
  {
    id: "lib-ancient-gate",
    title: "古镇层叠屋檐",
    category: "建筑符号",
    source: "海窝子鹅 IP 共创 · 素材分析",
    description: "从古镇门楼、灰瓦屋檐与窗棂格纹中提炼出的层叠轮廓，可作为角色帽檐、背景边框或导视装饰。",
    usage: "适合在新共创项目中作为地域识别元素，帮助 AI 在角色造型中保留本地建筑记忆点。",
    tags: ["地域识别", "建筑转译", "边框纹样"],
    imageUrl: materials[0]?.url,
  },
  {
    id: "lib-goose-food",
    title: "酱鹅摊位与美食记忆",
    category: "地方美食",
    source: "历史共创项目 · 商户反馈沉淀",
    description: "围裙、托盘、卤鹅暖色与烟火气组合，适合转译为角色道具、动作姿态或宣传贴纸元素。",
    usage: "调用后会进入新项目素材输入区，作为美食类图片素材参与后续可溯源分析。",
    tags: ["本地美食", "烟火气", "角色道具"],
    imageUrl: materials[0]?.url,
  },
  {
    id: "lib-bamboo-craft",
    title: "竹编斗笠与老手艺线条",
    category: "非遗/手工",
    source: "明月村烫油鹅 · 形状阶段",
    description: "斗笠弧线、竹编肌理和手工线条可被抽象为角色轮廓、服饰纹样或周边包装的图案底纹。",
    usage: "适合用于更乡土、更温暖的角色方案再生成，避免素材生硬堆砌。",
    tags: ["非遗纹样", "手工质感", "乡土温度"],
    imageUrl: materials[1]?.url,
  },
  {
    id: "lib-friendly-expression",
    title: "亲切表情与招呼动作",
    category: "角色行为",
    source: "村民/游客意见聚类",
    description: "由“像本地熟人一样会招呼人”“更亲切”这类共识沉淀出的表情与动作方向。",
    usage: "作为文本素材调用，可指导新项目中的角色表情、姿态和社交传播场景。",
    tags: ["情绪表达", "动作姿态", "社交传播"],
  },
];

function libraryElementToMaterial(element: LibraryElement): MaterialItem {
  return {
    id: `library-${element.id}`,
    title: element.title,
    type: element.imageUrl ? "image" : "text",
    url: element.imageUrl,
    note: `${element.description} 调用建议：${element.usage}`,
  };
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [calledElement, setCalledElement] = useState<LibraryElement | null>(null);
  const [maxVisitedStage, setMaxVisitedStage] = useState<StageKey>(() => routeToStage(window.location.pathname));

  const rememberStage = (stage: StageKey) => {
    setMaxVisitedStage((current) => Math.max(current, stage) as StageKey);
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = window.location.pathname;
      setPath(nextPath);
      rememberStage(routeToStage(nextPath));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPath: string) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    rememberStage(routeToStage(nextPath));
  };

  if (path === "/interactive-evolution-demo") {
    return <InteractiveEvolutionDemo />;
  }

  if (path === "/analysis-preview") {
    return <AnalysisPreviewPage maxVisitedStage={maxVisitedStage} onBack={() => navigate("/start")} onBackHome={() => navigate("/")} onContinue={() => navigate("/workspace")} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenGroupFeedback={() => navigate("/group-feedback")} onOpenThirdRound={() => navigate("/third-round-feedback")} onOpenFourthRound={() => navigate("/fourth-round-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} />;
  }

  if (path === "/mobile-feedback") {
    return <MobileFeedbackPage />;
  }

  if (path === "/final-confirmation") {
    return <FinalConfirmationPage onBackHome={() => navigate("/")} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenAnalysis={() => navigate("/analysis-preview")} onOpenGroupFeedback={() => navigate("/group-feedback")} onOpenThirdRound={() => navigate("/third-round-feedback")} onOpenFourthRound={() => navigate("/fourth-round-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} />;
  }

  if (path === "/mobile-final-summary") {
    return <MobileFinalSummaryPage onBack={() => navigate("/final-confirmation")} />;
  }

  if (path === "/group-feedback") {
    return <GroupFeedbackPage maxVisitedStage={maxVisitedStage} onBackHome={() => navigate("/")} onBack={() => navigate("/workspace")} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenAnalysis={() => navigate("/analysis-preview")} onOpenThirdRound={() => navigate("/third-round-feedback")} onOpenFourthRound={() => navigate("/fourth-round-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} />;
  }

  if (path === "/third-round-feedback") {
    return <ThirdRoundFeedbackPage maxVisitedStage={maxVisitedStage} onBackHome={() => navigate("/")} onBack={() => navigate("/group-feedback")} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenAnalysis={() => navigate("/analysis-preview")} onOpenGroupFeedback={() => navigate("/group-feedback")} onOpenFourthRound={() => navigate("/fourth-round-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} />;
  }

  if (path === "/fourth-round-feedback") {
    return <FourthRoundFeedbackPage maxVisitedStage={maxVisitedStage} onBackHome={() => navigate("/")} onBack={() => navigate("/third-round-feedback")} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenAnalysis={() => navigate("/analysis-preview")} onOpenGroupFeedback={() => navigate("/group-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} />;
  }

  if (path === "/workspace") {
    return <StudioApp key="workspace" initialStage={2} forceInitialStage initialMaxVisitedStage={maxVisitedStage} onStageVisited={rememberStage} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenAnalysis={() => navigate("/analysis-preview")} onOpenGroupFeedback={() => navigate("/group-feedback")} onOpenThirdRound={() => navigate("/third-round-feedback")} onOpenFourthRound={() => navigate("/fourth-round-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} calledElement={calledElement} onBackHome={() => navigate("/")} />;
  }

  if (path === "/start") {
    return <StudioApp key="start" startPhonePreview initialStage={0} forceInitialStage initialMaxVisitedStage={maxVisitedStage} onStageVisited={rememberStage} onOpenStart={() => navigate("/start")} onOpenWorkspace={() => navigate("/workspace")} onOpenAnalysis={() => navigate("/analysis-preview")} onOpenGroupFeedback={() => navigate("/group-feedback")} onOpenThirdRound={() => navigate("/third-round-feedback")} onOpenFourthRound={() => navigate("/fourth-round-feedback")} onOpenFinalConfirmation={() => navigate("/final-confirmation")} calledElement={calledElement} onBackHome={() => navigate("/")} />;
  }

  return (
    <HomePage
      onStartProject={() => {
        // 「开始创建 → 项目解析」= 开启全新项目：清空上一次工作台缓存并把已解锁进度归零，
        // 保证首次进入时左侧面板只点亮第一步，后续严格逐级解锁（不被历史进度提前放行）
        setCalledElement(null);
        clearWorkspaceState();
        clearFinalSelection();
        setMaxVisitedStage(0);
        navigate("/start");
      }}
      onUseElement={(element) => {
        // 调用元素同样是全新项目：进度归零，避免沿用上一项目的已解锁阶段
        setCalledElement(element);
        clearFinalSelection();
        setMaxVisitedStage(0);
        navigate("/start");
      }}
    />
  );
}

function FinalConfirmationPage({ onBackHome, onOpenStart, onOpenWorkspace, onOpenAnalysis, onOpenGroupFeedback, onOpenThirdRound, onOpenFourthRound, onOpenFinalConfirmation }: { onBackHome: () => void; onOpenStart: () => void; onOpenWorkspace: () => void; onOpenAnalysis: () => void; onOpenGroupFeedback: () => void; onOpenThirdRound: () => void; onOpenFourthRound: () => void; onOpenFinalConfirmation: () => void }) {
  const finalSelection = useMemo(() => readFinalSelectionRecord(), []);
  const plans = finalSelection.plans;
  const confirmedStage = finalSelection.confirmedStage;
  const stageTitles: Record<StageKey, string> = { 0: "输入素材", 1: "溯源分析", 2: "初始方案", 3: "第二轮", 4: "第三轮", 5: "第四轮" };
  const participantRows = [
    { label: "村民", value: roundResult.villagers, color: "#315FE8" },
    { label: "商户", value: roundResult.merchants, color: "#8F6DE8" },
    { label: "游客", value: roundResult.tourists, color: "#18A77A" },
  ];
  const participantTotal = participantRows.reduce((sum, row) => sum + row.value, 0);
  const tagSummary = Object.values(roundResult.tagsByCandidate)
    .flat()
    .reduce<Record<string, number>>((acc, tag) => ({ ...acc, [tag.label]: (acc[tag.label] ?? 0) + tag.count }), {});
  const topTags = Object.entries(tagSummary).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxVotes = Math.max(...roundResult.distribution.map((item) => item.votes), 1);
  const maxTagCount = Math.max(...topTags.map(([, count]) => count), 1);
  const averageConsensus = plans.length
    ? Math.round(plans.reduce((sum, plan) => sum + (plan.consensus ?? 0), 0) / plans.length)
    : 0;
  const planKeywords = Array.from(new Set(plans.flatMap((plan) => plan.keywords ?? []))).slice(0, 8);
  const heatmapRows = participantRows.map((row, rowIndex) => ({
    ...row,
    tags: topTags.slice(0, 5).map(([label, count], tagIndex) => {
      const groupBias = [1, 0.72, 0.46][rowIndex] ?? 0.6;
      const rhythm = [1, 0.84, 0.68, 0.9, 0.74][(rowIndex + tagIndex) % 5] ?? 0.8;
      const value = Math.max(12, Math.min(96, Math.round((count / maxTagCount) * 100 * groupBias * rhythm)));
      return { label, value };
    }),
  }));
  const reasoningSteps = [
    { title: "素材提取", detail: "从地方素材中提取酱鹅、斗笠、汤碗、围裙等可识别视觉符号。", score: 92 },
    { title: "意见拆解", detail: "将村民、商户、游客意见拆解为主体造型、文化表达、色彩系统和禁忌约束。", score: 84 },
    { title: "争议收敛", detail: "筛掉争议较高的装饰方向，保留共识更强的角色识别点。", score: 76 },
    { title: "最终确认", detail: `在${stageTitles[confirmedStage]}完成最终确认，形成可交付方案与后续资产化依据。`, score: averageConsensus || 67 },
  ];

  const handleSelectStage = (stage: StageKey) => {
    if (stage === 0) { onOpenStart(); return; }
    if (stage === 1) { onOpenAnalysis(); return; }
    if (stage === 2) { onOpenWorkspace(); return; }
    if (stage === 3) { onOpenGroupFeedback(); return; }
    if (stage === 4) { onOpenThirdRound(); return; }
    if (stage === 5) { onOpenFourthRound(); return; }
  };
  const goBackToConfirmedStage = () => handleSelectStage(confirmedStage);

  return (
    <div className="glass-page-bg h-screen overflow-hidden text-slate-800">
      <button type="button" onClick={onBackHome} className="app-nav-home">
        <ArrowLeft size={16} /> 返回首页
      </button>
      <TopStageBar status={{ currentStage: confirmedStage, stageLabel: "确认最终方案", roundStatus: "completed", participants: { villagers: roundResult.villagers, business: roundResult.merchants } }} />
      <div className="grid h-[calc(100vh-56px)] min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
        <WorkflowStepper currentStage={confirmedStage} maxVisitedStage={Math.max(confirmedStage, 2) as StageKey} onBack={goBackToConfirmedStage} onSelectStage={handleSelectStage} onOpenFinalConfirmation={onOpenFinalConfirmation} finalConfirmationActive titleOverrides={{ 3: "第二轮", 4: "第三轮", 5: "第四轮" }} />
        <main className="min-h-0 overflow-y-auto px-5 py-5 lg:px-7">
          <section className="mx-auto max-w-[1420px]">
            <div className="flex flex-col gap-3 border-b border-white/45 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/70 px-3 py-1 text-xs font-black text-[var(--color-brand-primary)] shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">
                  {stageTitles[confirmedStage]} · 最终确认
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">最终方案决策总览</h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  汇总已确认方案、不同群体的意见表达、投票分布、高频标签和生成推理链，方便把最终选择讲清楚、追溯清楚。
                </p>
              </div>
              <Button variant="outline" onClick={goBackToConfirmedStage}>返回确认轮次</Button>
            </div>

            {plans.length > 0 ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { label: "确认方案", value: `${plans.length}`, detail: stageTitles[confirmedStage] },
                    { label: "平均共识度", value: `${averageConsensus}%`, detail: "基于最终入选方案" },
                    { label: "意见表达量", value: `${participantTotal}`, detail: "村民 / 商户 / 游客" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[24px] border border-white/70 bg-white/46 px-5 py-4 shadow-[0_18px_42px_rgba(74,100,160,0.10)] backdrop-blur-2xl">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</div>
                      <div className="mt-2 text-3xl font-black text-slate-950">{item.value}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{item.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
                  <section className="rounded-[32px] border border-white/70 bg-white/42 p-5 shadow-[0_24px_68px_rgba(74,100,160,0.14)] backdrop-blur-2xl">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-950">最终方案</h2>
                        <p className="mt-1 text-xs font-bold text-slate-500">入选方案与核心视觉资产</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[var(--color-brand-primary)]">{stageTitles[confirmedStage]}</span>
                    </div>
                    <div className="mt-5 grid gap-4">
                      {plans.map((plan, index) => (
                        <article key={plan.id} className="grid gap-4 rounded-[26px] border border-white/72 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] sm:grid-cols-[150px_minmax(0,1fr)]">
                          <div className="relative overflow-hidden rounded-[22px] bg-white/82">
                            <img src={plan.imageUrl} alt={plan.title} className="aspect-square w-full object-cover" />
                            <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-xl app-gradient-primary text-sm font-black text-white">{index + 1}</span>
                          </div>
                          <div className="min-w-0 py-1">
                            <div className="text-[11px] font-black text-slate-400">第 {plan.generation + 1} 代 · {plan.stage}</div>
                            <h3 className="mt-2 text-lg font-black leading-6 text-slate-950">{plan.directionName ?? plan.title}</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{plan.description}</p>
                            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3">
                              <div className="h-2.5 overflow-hidden rounded-full bg-blue-50">
                                <div className="h-full rounded-full bg-[linear-gradient(90deg,#315FE8,#8F6DE8)]" style={{ width: `${plan.consensus ?? averageConsensus}%` }} />
                              </div>
                              <span className="text-right text-xs font-black text-[var(--color-brand-primary)]">{plan.consensus ?? averageConsensus}%</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {(plan.keywords ?? []).slice(0, 4).map((keyword) => (
                                <span key={keyword} className="rounded-full bg-white/75 px-2.5 py-1 text-[11px] font-black text-slate-600">{keyword}</span>
                              ))}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-white/70 bg-white/42 p-5 shadow-[0_24px_68px_rgba(74,100,160,0.14)] backdrop-blur-2xl">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-xl font-black text-slate-950">大众意见可视化</h2>
                        <p className="mt-1 text-xs font-bold text-slate-500">群体贡献占比、标签热度与意见密度</p>
                      </div>
                      <div className="text-xs font-black text-slate-400">总表达 {participantTotal} 人</div>
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="rounded-[26px] border border-white/70 bg-white/50 p-4">
                        <div className="text-sm font-black text-slate-800">群体表达占比</div>
                        <div className="mt-4 space-y-4">
                          {participantRows.map((row) => {
                            const percent = Math.round((row.value / participantTotal) * 100);
                            return (
                              <div key={row.label} className="grid grid-cols-[56px_minmax(0,1fr)_42px] items-center gap-2 text-xs font-black">
                                <span className="text-slate-600">{row.label}</span>
                                <div className="h-3 overflow-hidden rounded-full bg-white/80">
                                  <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: row.color }} />
                                </div>
                                <span className="text-right text-slate-500">{percent}%</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-2">
                          {participantRows.map((row) => (
                            <div key={row.label} className="rounded-2xl bg-white/62 px-2 py-3 text-center">
                              <div className="mx-auto size-3 rounded-full" style={{ backgroundColor: row.color }} />
                              <div className="mt-2 text-lg font-black text-slate-900">{row.value}</div>
                              <div className="text-[10px] font-bold text-slate-400">{row.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[26px] border border-white/70 bg-white/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-black text-slate-800">群体 × 高频标签热力图</div>
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                            <span>弱</span><span className="h-2 w-12 rounded-full bg-[linear-gradient(90deg,rgba(49,95,232,0.12),rgba(143,109,232,0.9))]" /><span>强</span>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: "58px repeat(5, minmax(56px, 1fr))" }}>
                          <div />
                          {topTags.slice(0, 5).map(([label]) => (
                            <div key={label} className="truncate text-center text-[10px] font-black text-slate-400">{label}</div>
                          ))}
                          {heatmapRows.map((row) => (
                            <div key={row.label} className="contents">
                              <div className="flex items-center text-xs font-black text-slate-600">{row.label}</div>
                              {row.tags.map((tag) => (
                                <div
                                  key={`${row.label}-${tag.label}`}
                                  className="flex h-12 items-center justify-center rounded-2xl border border-white/60 text-xs font-black text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                                  style={{ backgroundColor: `rgba(79, 111, 232, ${0.12 + tag.value / 130})` }}
                                  title={`${row.label} · ${tag.label} ${tag.value}`}
                                >
                                  {tag.value}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <section className="rounded-[32px] border border-white/70 bg-white/42 p-5 shadow-[0_22px_56px_rgba(74,100,160,0.12)] backdrop-blur-2xl">
                    <h2 className="text-lg font-black text-slate-950">方案得票分布</h2>
                    <div className="mt-4 space-y-3">
                      {roundResult.distribution.slice(0, 5).map((item) => {
                        const percent = Math.round((item.votes / maxVotes) * 100);
                        return (
                          <div key={item.candidate} className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-3 text-xs font-black text-slate-600">
                            <span>{item.candidate}</span>
                            <div className="relative h-8">
                              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
                              <div className="absolute left-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#9fb8ff,#8d7cf2)]" style={{ width: `${percent}%` }} />
                              <span className="absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-white bg-[#315FE8] shadow-[0_8px_18px_rgba(49,95,232,0.24)]" style={{ left: `calc(${percent}% - 10px)` }} />
                            </div>
                            <span className="text-right">{item.votes}票</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-white/70 bg-white/42 p-5 shadow-[0_22px_56px_rgba(74,100,160,0.12)] backdrop-blur-2xl">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div>
                        <h2 className="text-lg font-black text-slate-950">高频标签云</h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {topTags.map(([label, count], index) => (
                            <span
                              key={label}
                              className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 font-black text-slate-600 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.72)]"
                              style={{ fontSize: `${12 + Math.max(0, 5 - index)}px` }}
                            >
                              #{index + 1} {label} · {count}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {planKeywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-[var(--color-brand-primary)]">{keyword}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-950">推理过程</h2>
                        <div className="mt-4 space-y-3">
                          {reasoningSteps.map((item, index) => (
                            <div key={item.title} className="grid grid-cols-[34px_minmax(0,1fr)_42px] gap-3 rounded-[22px] bg-white/56 p-3">
                              <span className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-[var(--color-brand-primary)]">{index + 1}</span>
                              <div>
                                <div className="text-sm font-black text-slate-800">{item.title}</div>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.detail}</p>
                              </div>
                              <div className="flex items-center justify-end text-xs font-black text-[#8F6DE8]">{item.score}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="mt-7 rounded-[24px] border border-dashed border-blue-200 bg-white/45 px-6 py-12 text-center text-sm font-bold text-slate-500">
                暂未确认最终方案，请返回画布选择方案后再确认。
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function MobileFinalSummaryPage({ onBack }: { onBack: () => void }) {
  const finalSelection = useMemo(() => readFinalSelectionRecord(), []);
  const userContribution = useMemo(() => readMobileFinalContribution(), []);
  const plan = finalSelection.plans[0];
  const fallbackCandidate = initialNodes[0]?.candidate;
  const displayPlan = plan ?? (fallbackCandidate ? {
    title: fallbackCandidate.title,
    directionName: fallbackCandidate.directionName,
    imageUrl: fallbackCandidate.imageUrl,
    description: fallbackCandidate.tagline ?? fallbackCandidate.description,
    keywords: fallbackCandidate.keywords,
    consensus: fallbackCandidate.consensus,
  } : undefined);
  const tagSummary = Object.values(roundResult.tagsByCandidate)
    .flat()
    .reduce<Record<string, number>>((acc, tag) => ({ ...acc, [tag.label]: (acc[tag.label] ?? 0) + tag.count }), {});
  const topTags = Object.entries(tagSummary).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const preferredTags = (userContribution?.preferredTags.length
    ? userContribution.preferredTags
    : (displayPlan?.keywords?.length ? displayPlan.keywords : topTags.map(([label]) => label)).slice(0, 5).map((label, index) => ({ label, weight: 86 - index * 6 }))
  ).slice(0, 5);
  const actionCounts = userContribution?.actionCounts ?? { like: 6, unsure: 3, dislike: 2 };
  const totalActions = Math.max(1, actionCounts.like + actionCounts.unsure + actionCounts.dislike);
  const personalizedRows = preferredTags.slice(0, 4).map((tag, index) => {
    const reflected = [
      "角色主表情与亲和气质",
      "轮廓比例、姿态和识别节奏",
      "主色控制与装饰密度",
      "地方符号与传播记忆点",
    ][index] ?? "最终方案细节";
    const mode = index === 0 ? "重点强化" : index === 1 ? "优先保留" : index === 2 ? "适度收敛" : "继续探索";
    return { input: tag.label, weight: tag.weight, reflected, mode };
  });

  return (
    <main className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_8%,rgba(142,126,255,0.26),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(77,132,255,0.22),transparent_30%),linear-gradient(135deg,#eaf3ff_0%,#f5f0ff_52%,#eef7ff_100%)] px-4 py-6 text-slate-900">
      <section className="relative flex min-h-[840px] w-full max-w-[430px] flex-col overflow-hidden rounded-[36px] border border-white/70 bg-white/34 shadow-[0_26px_80px_rgba(83,89,178,0.22)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/56 via-white/20 to-violet-200/24" />
        <div className="relative px-6 pb-7 pt-6">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/50 px-3 py-2 text-xs font-black text-slate-600 shadow-sm backdrop-blur-xl">
            <ArrowLeft size={14} /> 返回总览
          </button>
          <div className="mt-5 rounded-[24px] border border-white/65 bg-white/42 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#315FE8]">共创结果</div>
            <h1 className="mt-2 text-2xl font-black leading-8 text-slate-950">谢谢，你的选择已进入最终方案</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">你留下的偏好、犹豫和理由，已经汇入本轮共创判断。下面可以看到它们如何影响最终 IP 的气质、细节和保留方向。</p>
          </div>

          <section className="mt-5 rounded-[28px] border border-white/70 bg-white/40 p-4 shadow-[0_18px_44px_rgba(94,108,190,0.15)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-400">最终方案</div>
                <h2 className="mt-1 text-lg font-black text-slate-950">{displayPlan?.directionName ?? displayPlan?.title ?? "已确认方案"}</h2>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[#315FE8]">{displayPlan?.consensus ?? 67}% 共识</span>
            </div>
            {displayPlan?.imageUrl ? (
              <div className="mt-4 rounded-[24px] border border-white/70 bg-white/50 p-3 shadow-[0_14px_32px_rgba(94,108,190,0.13)]">
                <img src={displayPlan.imageUrl} alt={displayPlan.title} className="aspect-square w-full rounded-[20px] bg-white object-cover" />
              </div>
            ) : null}
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{displayPlan?.description ?? "方案已整合群体偏好和高频标签，进入最终确认。"}</p>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/70 bg-white/40 p-4 shadow-[0_18px_44px_rgba(94,108,190,0.13)] backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">你的整体偏好</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {preferredTags.slice(0, 4).map((tag) => (
                <span key={tag.label} className="rounded-full bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] px-3 py-1.5 text-xs font-black text-white shadow-[0_10px_22px_rgba(79,111,232,0.20)]">
                  {tag.label} · {tag.weight}
                </span>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["喜欢", actionCounts.like, "#18A77A"],
                ["不确定", actionCounts.unsure, "#F59E0B"],
                ["不喜欢", actionCounts.dislike, "#EF4B72"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-2xl bg-white/52 px-2 py-3 text-center">
                  <div className="text-[11px] font-black text-slate-400">{label}</div>
                  <div className="mt-1 text-lg font-black" style={{ color: String(color) }}>{value}</div>
                  <div className="mx-auto mt-2 h-1.5 w-full rounded-full bg-white/70">
                    <div className="h-1.5 rounded-full" style={{ width: `${(Number(value) / totalActions) * 100}%`, backgroundColor: String(color) }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/70 bg-white/40 p-4 shadow-[0_18px_44px_rgba(94,108,190,0.13)] backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">你的贡献落点</div>
            <div className="mt-4 space-y-3">
              {personalizedRows.map((row, index) => (
                <article key={row.input} className="rounded-[22px] border border-white/70 bg-white/52 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#315FE8] text-xs font-black text-white">{index + 1}</span>
                      <span className="text-sm font-black text-slate-800">{row.input}</span>
                    </div>
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-[#7B61FF]">{row.mode}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-[72px_minmax(0,1fr)] gap-2 text-xs font-bold leading-5">
                    <span className="text-slate-400">偏好值</span>
                    <span className="text-slate-600">{row.weight}</span>
                    <span className="text-slate-400">体现为</span>
                    <span className="text-slate-700">{row.reflected}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/70 bg-white/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)] backdrop-blur-xl">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">群体反馈权重</div>
            <div className="mt-4 space-y-3">
              {topTags.map(([label, count]) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-black text-slate-600">
                    <span>{label}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/65">
                    <div className="h-2.5 rounded-full bg-gradient-to-r from-[#315FE8] to-[#8F6DE8]" style={{ width: `${Math.min(100, (count / Math.max(topTags[0]?.[1] ?? 1, 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 grid grid-cols-3 gap-2 rounded-[24px] border border-white/70 bg-white/36 p-3 backdrop-blur-xl">
            {[
              ["选择", "已记录"],
              ["意见", "已映射"],
              ["方案", "已确认"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/52 px-2 py-3 text-center">
                <div className="text-[11px] font-black text-[#315FE8]">{label}</div>
                <div className="mt-1 text-xs font-black text-slate-700">{value}</div>
              </div>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function HomePage({ onStartProject, onUseElement }: { onStartProject: () => void; onUseElement: (element: LibraryElement) => void }) {
  const [selectedElement, setSelectedElement] = useState<LibraryElement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleUpload = (event: { target: HTMLInputElement }) => {
    const names = Array.from(event.target.files ?? []).map((file) => file.name);
    if (names.length) setUploadedFiles((current) => [...current, ...names]);
  };

  const completeCreation = () => {
    setShowCreateModal(false);
    onStartProject();
  };

  return (
    <main className="glass-page-bg min-h-screen overflow-x-hidden px-5 text-slate-800 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1420px]">
        <section className="flex min-h-[calc(100vh-92px)] flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
          <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
            乡村IP共创平台
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-500 sm:text-lg">
            汇聚地方素材、群体意见与 AI 生成能力，帮助创作者快速沉淀可复用的乡村 IP 视觉资产。
          </p>
          <Button variant="gradient" size="lg" onClick={() => setShowCreateModal(true)} className="mt-9 min-w-[180px]">
            开始创建 <ArrowRight size={18} />
          </Button>
        </section>

        <motion.section
          id="element-library"
          className="glass-panel scroll-reveal-panel rounded-[32px] p-6 sm:p-7"
          initial={{ opacity: 0.42, y: 96, scale: 0.985 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: false, amount: 0.28 }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black text-[#7257D9]">
                <Layers3 size={14} /> 元素库 · 示例资产
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">复用已沉淀的素材元素</h2>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                元素库展示可复用视觉符号和语义资产的示例，尚无真实项目验证数据。点击卡片可查看示例来源、用途与适用场景，也可以调用到新的演示项目中继续分析。
              </p>
            </div>
            <div className="glass-card rounded-3xl p-3 text-center">
              <div className="text-2xl font-black text-slate-900">{ELEMENT_LIBRARY.length}<span className="ml-1 text-sm text-slate-400">个</span></div>
              <div className="mt-1 text-xs font-bold text-slate-500">可调用元素</div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ELEMENT_LIBRARY.map((element) => (
              <article key={element.id} className="glass-card group flex min-h-[340px] flex-col overflow-hidden rounded-[28px] p-3 transition hover:-translate-y-1 hover:bg-white/40 hover:shadow-[0_22px_56px_rgba(52,73,146,0.16)]">
                <div className="glass-inner flex h-36 items-center justify-center overflow-hidden rounded-[22px]">
                  {element.imageUrl ? <img src={element.imageUrl} alt={element.title} className="size-full object-cover" /> : <MessageSquare className="text-violet-500" size={54} />}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="glass-chip rounded-full px-2.5 py-1 text-[11px] font-black text-[#315FE8]">{element.category}</span>
                    <span className="text-[11px] font-bold text-slate-400">可复用</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black leading-6 text-slate-900">{element.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">{element.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {element.tags.slice(0, 2).map((tag) => <span key={tag} className="glass-chip rounded-full px-2 py-1 text-[11px] font-bold text-slate-600">{tag}</span>)}
                  </div>
                  <div className="mt-auto flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedElement(element)}><Eye size={15} />详情</Button>
                    <Button variant="gradient" className="flex-1" onClick={() => onUseElement(element)}>调用</Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {showCreateModal ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/24 p-5 backdrop-blur-2xl">
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: 0.97 }} className="glass-modal flex max-h-[92vh] w-full max-w-[1080px] flex-col overflow-hidden rounded-[36px]">
              <div className="flex items-start justify-between gap-5 border-b border-white/45 px-7 py-6">
                <div>
                  <div className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black text-[#315FE8]">
                    <FileImage size={14} /> 新建共创项目
                  </div>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">项目基础信息</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">填写项目背景并上传地方文化素材，系统将进入后续解析流程。</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-white/45 hover:text-slate-800"><X size={22} /></button>
              </div>

              <div className="overflow-y-auto px-7 py-6">
                <div>
                  <section className="glass-card rounded-[28px] p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-black text-slate-700">
                        项目名称
                        <input className="w-full rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white/70" placeholder="例如：海窝子鹅 IP 共创" />
                      </label>
                      <label className="space-y-2 text-sm font-black text-slate-700">
                        发起人身份
                        <select className="w-full rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white/70" defaultValue="designer">
                          <option value="designer">设计发起人 / 创作者</option>
                          <option value="operator">乡村运营方</option>
                          <option value="merchant">本地商户</option>
                          <option value="researcher">文化研究者</option>
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-black text-slate-700 sm:col-span-2">
                        设计目标
                        <textarea className="min-h-[92px] w-full rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white/70" placeholder="描述希望共创出的 IP 方向、情绪气质、要解决的传播问题..." />
                      </label>
                      <label className="space-y-2 text-sm font-black text-slate-700">
                        地区
                        <input className="w-full rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white/70" placeholder="例如：四川彭州海窝子古镇" />
                      </label>
                      <label className="space-y-2 text-sm font-black text-slate-700">
                        用途
                        <select className="w-full rounded-2xl border border-white/60 bg-white/45 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white/70" defaultValue="ip">
                          <option value="ip">乡村 IP 角色 / 视觉资产</option>
                          <option value="tourism">文旅传播物料</option>
                          <option value="packaging">农产品包装</option>
                          <option value="event">节庆活动形象</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-dashed border-blue-200/80 bg-white/30 p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-black text-slate-800"><UploadCloud size={18} className="text-[#315FE8]" />上传当地文化元素采集内容</div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">支持图片、PDF、Word、表格、文本等文件，用于后续解析地方符号与设计目标。</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#315FE8] to-[#8F6DE8] px-5 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(49,95,232,0.22)] transition hover:-translate-y-0.5">
                          选择文件
                          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" className="hidden" onChange={handleUpload} />
                        </label>
                      </div>
                      {uploadedFiles.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {uploadedFiles.map((fileName, index) => (
                            <span key={`${fileName}-${index}`} className="glass-chip rounded-full px-3 py-1.5 text-xs font-bold text-slate-600">{fileName}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </section>

                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/45 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-xs font-semibold leading-5 text-slate-500">解析之后会自动形成设计目标、地方文化元素与后续共创任务内容。</p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>取消</Button>
                  <Button variant="gradient" onClick={completeCreation}>项目解析 <ArrowRight size={16} /></Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}

        {selectedElement ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-5 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} className="glass-modal w-full max-w-[760px] overflow-hidden rounded-[32px]">
              <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="bg-white/18 p-5">
                  <div className="glass-inner flex h-64 items-center justify-center overflow-hidden rounded-[24px]">
                    {selectedElement.imageUrl ? <img src={selectedElement.imageUrl} alt={selectedElement.title} className="size-full object-cover" /> : <MessageSquare className="text-violet-500" size={72} />}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="glass-chip rounded-full px-3 py-1 text-xs font-black text-[#315FE8]">{selectedElement.category}</span>
                      <h3 className="mt-4 text-2xl font-black text-slate-950">{selectedElement.title}</h3>
                    </div>
                    <button onClick={() => setSelectedElement(null)} className="rounded-full p-2 text-slate-500 transition hover:bg-white/45 hover:text-slate-800"><X size={20} /></button>
                  </div>
                  <div className="mt-5 space-y-4 text-sm font-semibold leading-7 text-slate-600">
                    <p>{selectedElement.description}</p>
                    <div className="glass-card rounded-2xl p-4">
                      <div className="text-xs font-black text-slate-500">来源</div>
                      <div className="mt-1 text-slate-800">{selectedElement.source}</div>
                    </div>
                    <div className="glass-card rounded-2xl p-4 text-[#315FE8]">
                      <div className="text-xs font-black text-[#5D78D8]">调用方式</div>
                      <div className="mt-1">{selectedElement.usage}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedElement.tags.map((tag) => <span key={tag} className="glass-chip rounded-full px-3 py-1 text-xs font-black text-slate-600">{tag}</span>)}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setSelectedElement(null)}>关闭</Button>
                    <Button variant="gradient" onClick={() => onUseElement(selectedElement)}>调用到新项目 <ArrowRight size={16} /></Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function StudioApp({ onOpenStart, onOpenWorkspace, onOpenAnalysis, onOpenGroupFeedback, onOpenThirdRound, onOpenFourthRound, onOpenFinalConfirmation, initialStage = 0, initialMaxVisitedStage = initialStage, onStageVisited, calledElement = null, onBackHome, startPhonePreview = false, forceInitialStage = false }: { onOpenStart: () => void; onOpenWorkspace: () => void; onOpenAnalysis: () => void; onOpenGroupFeedback: () => void; onOpenThirdRound: () => void; onOpenFourthRound: () => void; onOpenFinalConfirmation: () => void; initialStage?: StageKey; initialMaxVisitedStage?: StageKey; onStageVisited?: (stage: StageKey) => void; calledElement?: LibraryElement | null; onBackHome: () => void; startPhonePreview?: boolean; forceInitialStage?: boolean }) {
  // 调用元素进入的是「全新项目」，需丢弃上一项目残留的共创缓存
  const persisted = useMemo(() => (calledElement ? null : loadWorkspaceState()), [calledElement]);
  const forcedStageSnapshot = useMemo(
    () => forceInitialStage ? (persisted?.stageSnapshots?.[initialStage] ?? stageCanvasTemplate(initialStage, persisted?.roundState ?? "none")) : null,
    [forceInitialStage, initialStage, persisted],
  );
  // 进入某路由时，stage 不能低于该路由的最小阶段（如 /workspace 的 initialStage=2）。
  // 否则从「项目解析」点「确认并继续」跳到 /workspace 时，会被上一阶段(/start 分析=1)的落盘进度
  // 拉回 stage 1，导致 URL 是 /workspace 却仍渲染上传/分析界面而非初始方案工作台。
  const [stage, setStage] = useState<StageKey>(forceInitialStage ? initialStage : Math.max(persisted?.stage ?? initialStage, initialStage) as StageKey);
  const [maxVisitedStage, setMaxVisitedStage] = useState<StageKey>(
    Math.max(initialStage, initialMaxVisitedStage, persisted?.maxVisitedStage ?? 0) as StageKey,
  );
  const [materialsLoaded, setMaterialsLoaded] = useState(initialStage > 0 || Boolean(calledElement));
  const [analyzing, setAnalyzing] = useState(false);
  const [nodes, setNodes] = useState<EvolutionNode[]>(forcedStageSnapshot?.nodes ?? persisted?.nodes ?? initialNodes);
  const [edges, setEdges] = useState<EvolutionEdge[]>(forcedStageSnapshot?.edges ?? persisted?.edges ?? []);
  // 生成过评价链接即代表本轮已发起；切回工作台时据此恢复「运行中」，
  // 避免右侧边栏底部「查看群体反馈结果」绿框因 roundState 在阶段切换中被重置而消失
  const [roundState, setRoundState] = useState<"none" | "running" | "completed">(() => {
    if (forcedStageSnapshot) return forcedStageSnapshot.roundState;
    if (persisted?.roundState === "completed") return "completed";
    if (persisted?.roundPanel?.generatedLink) return "running";
    return persisted?.roundState ?? "none";
  });
  const [toast, setToast] = useState(calledElement ? `已调用「${calledElement.title}」到新共创项目素材区` : "");
  const [editingNode, setEditingNode] = useState<EvolutionNode | null>(null);
  const [editText, setEditText] = useState("");
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig>(defaultFeedbackConfig);
  const [coCreationPanelOpen, setCoCreationPanelOpen] = useState(persisted?.coCreationPanelOpen ?? false);
  const [finalSelectionMode, setFinalSelectionMode] = useState(false);
  const [finalSelectedIds, setFinalSelectedIds] = useState<string[]>([]);
  // 画布视图状态：缩放/平移视口 + 卡片拖拽位置，跟随页面切换一并恢复，避免画布布局被重置
  const [canvasViewport, setCanvasViewport] = useState(persisted?.viewport);
  const [canvasPositions, setCanvasPositions] = useState(persisted?.elementPositions);
  // 右侧共创边栏操作状态：跨页面切换后整体恢复，避免「生成链接」流程被打回重做一次
  const [roundPanelState, setRoundPanelState] = useState(persisted?.roundPanel);
  // 各阶段画布快照：阶段间来回切换时恢复「初次使用后的最终形态」（方案卡片、连线、轮次状态），避免被模板重置
  const [stageSnapshots, setStageSnapshots] = useState<Partial<Record<StageKey, StageCanvasSnapshot>>>(persisted?.stageSnapshots ?? {});

  // 持久化共创操作状态：跳转其他页面再返回 /workspace 时自动恢复，无需重复「生成链接」
  useEffect(() => {
    // 当前阶段的实时画布即该阶段的最新形态，落盘前合并进快照表，保证刷新/跨页后仍能逐阶段还原
    const mergedSnapshots = { ...stageSnapshots, [stage]: { nodes, edges, roundState } };
    saveWorkspaceState({ uiVersion: WORKSPACE_UI_VERSION, stage, maxVisitedStage, nodes, edges, roundState, coCreationPanelOpen, viewport: canvasViewport, elementPositions: canvasPositions, roundPanel: roundPanelState, stageSnapshots: mergedSnapshots });
  }, [stage, maxVisitedStage, nodes, edges, roundState, coCreationPanelOpen, canvasViewport, canvasPositions, roundPanelState, stageSnapshots]);

  // 调用元素 = 开启全新项目，清掉历史共创缓存，避免串场
  useEffect(() => {
    if (calledElement) clearWorkspaceState();
  }, [calledElement]);

  const projectMaterials = useMemo(
    () => calledElement ? [libraryElementToMaterial(calledElement), ...materials] : materials,
    [calledElement],
  );

  useEffect(() => {
    if (!calledElement) return;
    const timer = window.setTimeout(() => {
      setMaterialsLoaded(true);
      setToast(`已调用「${calledElement.title}」到新共创项目素材区`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [calledElement]);

  const status: StageStatus = useMemo(() => {
    if (stage === 5) {
      return { currentStage: 5, stageLabel: "阶段 1：形状", roundId: roundResult.roundId, roundStatus: "completed", participants: { villagers: 45, business: 28 } };
    }
    if (stage === 4) {
      return { currentStage: 4, stageLabel: "第二轮", roundId: roundState === "none" ? undefined : "97758621", roundStatus: roundState, participants: roundState === "none" ? { villagers: 0, business: 0 } : { villagers: 12, business: 8 } };
    }
    if (stage === 3) {
      return { currentStage: 3, stageLabel: "第一轮", roundId: "97758621", roundStatus: "running", participants: { villagers: 12, business: 8 } };
    }
    if (stage === 0) return { currentStage: 0, stageLabel: "阶段0-上传素材", roundStatus: "none", participants: { villagers: 0, business: 0 } };
    if (stage === 1) return { currentStage: 1, stageLabel: "阶段 1：可溯源分析", roundStatus: "none", participants: { villagers: 0, business: 0 } };
    return { currentStage: 2, stageLabel: "阶段 2：图案", roundStatus: "none", participants: { villagers: 0, business: 0 } };
  }, [roundState, stage]);

  const moveToStage = (nextStage: StageKey) => {
    // 正向推进前，先把当前阶段的画布形态存入快照，便于之后切回时原样还原
    setStageSnapshots((prev) => ({ ...prev, [stage]: { nodes, edges, roundState } }));
    setStage(nextStage);
    setMaxVisitedStage((current) => Math.max(current, nextStage) as StageKey);
    onStageVisited?.(nextStage);
  };

  const viewStage = (nextStage: StageKey) => {
    // 严格顺序解锁：未抵达过的阶段一律拦截，与左侧面板灰色禁用态一致。
    if (nextStage > maxVisitedStage) return;

    // 左侧流程按真实页面路由跳转，避免仅替换标题但仍打开旧的 workspace 内部阶段。
    if (nextStage === 0) {
      onOpenStart();
      return;
    }
    if (nextStage === 1) {
      onOpenAnalysis();
      return;
    }
    if (nextStage === 2) {
      if (stage === 2) return;
      onOpenWorkspace();
      return;
    }
    if (nextStage === 3) {
      onOpenGroupFeedback();
      return;
    }
    if (nextStage === 4) {
      onOpenThirdRound();
      return;
    }
    if (nextStage === 5) {
      onOpenFourthRound();
      return;
    }
  };

  const goBack = () => {
    const chain: StageKey[] = [0, 1, 2, 3, 4, 5];
    const index = chain.indexOf(stage);
    if (index <= 0) return;
    viewStage(chain[index - 1]);
  };

  const startAnalysis = (payload: AnalysisPayload) => {
    window.sessionStorage.setItem(ANALYSIS_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
    setAnalyzing(true);
    moveToStage(1);
    setToast("可溯源 Prompt 工作流正在分析素材与意见...");
    window.setTimeout(() => {
      setAnalyzing(false);
      onOpenAnalysis();
    }, 650);
  };

  const regenerate = (node: EvolutionNode) => {
    const nextNodes = [...initialNodes, ...childNodes];
    const nextEdges = childEdges.map((edge) => ({ ...edge, source: node.generation === 0 ? node.id : "n1" }));
    setNodes(nextNodes);
    setEdges(nextEdges);
    setStageSnapshots((prev) => ({ ...prev, [stage]: { nodes: nextNodes, edges: nextEdges, roundState } }));
    setToast(`已基于「${node.candidate.title}」生成下一代方案，并建立父子连线`);
  };

  // 「确认生成」：在画布上新增一张「同轮局部调整」方案卡片（variant）。
  // 关键：这是对当前轮所选方案的局部微调，generation 与父代保持一致——**不推进轮次**，
  // 仍归属当前轮（如第一轮的局部调整）。只有手机端交互进化汇总才会推进到下一轮。
  const generateRefined = (parent: EvolutionNode, tuning: { semantic: string; params: { id: string; label: string; value: number; villagerAverage: number; touristAverage: number }[] }) => {
    const id = `variant-${parent.id}-${Date.now()}`;
    const variantNode: EvolutionNode = {
      id,
      generation: parent.generation, // 同轮局部调整：沿用父代轮次，不 +1
      stage: parent.stage,
      kind: "variant",
      parentId: parent.id,
      tuning,
      candidate: {
        ...parent.candidate,
        id,
        title: `${parent.candidate.title} · 局部调整`,
        directionCode: parent.candidate.directionCode ? `${parent.candidate.directionCode}′` : undefined,
        directionName: parent.candidate.directionName ? `${parent.candidate.directionName} · 局部调整` : undefined,
        promptTrace: [...parent.candidate.promptTrace, `本轮局部调整：${tuning.semantic || "默认参数"}`],
      },
    };
    setNodes((current) => [...current, variantNode]);
    setEdges((current) => [...current, { id: `e-${id}`, source: parent.id, target: id }]);
    setToast(`已在本轮基础上生成「${parent.candidate.title}」的局部调整方案（仍属当前轮，未进入下一轮）`);
  };

  const startRound = (config: RoundConfig) => {
    console.info("Mock round config", config);
    setCoCreationPanelOpen(true);
    setRoundState("running");
    // 保持在当前 workspace 页面，不切换阶段；操作结果在右侧共创边栏内展示
    setToast("本地演示链接已生成；未向参与者发送，反馈不跨设备同步");
  };

  const submitEdit = () => {
    if (!editingNode) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === editingNode.id
          ? { ...node, candidate: { ...node.candidate, description: editText || node.candidate.description, promptTrace: [...node.candidate.promptTrace, `创作者修改：${editText || "调整细节"}`] } }
          : node,
      ),
    );
    setToast("修改意见已写入该方案的 mock Prompt 追踪链");
    setEditingNode(null);
    setEditText("");
  };

  const toggleCoCreationPanel = () => {
    setCoCreationPanelOpen((current) => !current);
  };

  const toggleFinalPlan = (node: EvolutionNode) => {
    setFinalSelectedIds((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
  };

  const confirmFinalSelection = () => {
    if (finalSelectedIds.length === 0) return;
    saveFinalSelection(nodes, finalSelectedIds, stage);
    onOpenFinalConfirmation();
  };

  const toggleNodeSelect = (node: EvolutionNode) => {
    if (finalSelectionMode) {
      toggleFinalPlan(node);
      return;
    }
    setNodes((current) => current.map((item) => (item.id === node.id ? { ...item, selected: !item.selected } : item)));
  };

  const finalSelectedIdSet = new Set(finalSelectedIds);
  const canvasNodes = finalSelectionMode ? nodes.map((node) => ({ ...node, selected: finalSelectedIdSet.has(node.id) })) : nodes;

  const selectedPlans = nodes
    // 初始方案与本轮派生方案（局部调整 / 进化子代）均可参与共创勾选
    .filter((node) => isSelectableParent(node))
    .map((node, index) => ({
      id: node.id,
      index: index + 1,
      title: node.candidate.title,
      imageUrl: node.candidate.imageUrl,
      description: node.candidate.tagline ?? node.candidate.description,
      keywords: node.candidate.keywords,
      consensus: node.candidate.consensus,
      selected: Boolean(node.selected),
    }))
    .filter((plan) => plan.selected);

  const workbench = (
    <main className="relative h-full min-h-0 overflow-hidden bg-transparent">
      <EvolutionCanvas
        key={`workspace-canvas-v${WORKSPACE_UI_VERSION}-${stage}`}
        nodes={canvasNodes}
        edges={edges}
        selectionMode={coCreationPanelOpen || finalSelectionMode}
        selectableNodeIds={finalSelectionMode ? nodes.map((node) => node.id) : undefined}
        autoFit
        onModify={(node) => setEditingNode(node)}
        onRegenerate={regenerate}
        onToggleSelect={toggleNodeSelect}
        onGenerate={generateRefined}
        initialViewport={canvasViewport}
        initialPositions={canvasPositions}
        onViewStateChange={({ viewport, elementPositions }) => {
          setCanvasViewport(viewport);
          setCanvasPositions(elementPositions);
        }}
      />
      <RoundManagementPanel initialConfig={roundConfig} running={roundState === "running"} selectedPlans={selectedPlans} onStartRound={startRound} onViewResults={onOpenGroupFeedback} open={coCreationPanelOpen} onToggle={toggleCoCreationPanel} initialPanelState={roundPanelState} onPanelStateChange={setRoundPanelState} finalSelectionActive={finalSelectionMode} finalSelectedCount={finalSelectedIds.length} onToggleFinalSelection={() => setFinalSelectionMode(true)} onConfirmFinalSelection={confirmFinalSelection} />
    </main>
  );

  return (
    <div className="glass-page-bg h-screen overflow-hidden">
      <button
        type="button"
        onClick={onBackHome}
        className="app-nav-home"
      >
        <ArrowLeft size={16} /> 返回首页
      </button>
      <TopStageBar status={status} />
      <div className="grid h-[calc(100vh-56px)] min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
        <WorkflowStepper currentStage={stage} maxVisitedStage={maxVisitedStage} onBack={goBack} onSelectStage={viewStage} onOpenFinalConfirmation={onOpenFinalConfirmation} />
        <div className="min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div className="h-full min-h-0" key={stage === 0 ? "upload" : stage === 5 ? "final" : "workspace"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {stage === 0 || stage === 1 ? (
                <div className="relative h-full overflow-hidden">
                  <div className={startPhonePreview ? "h-full overflow-auto pr-[360px]" : "h-full overflow-auto"}>
                    <UploadStage project={projectInfo} materials={projectMaterials} opinions={opinions} loaded={materialsLoaded} analyzing={analyzing} feedbackConfig={feedbackConfig} onFeedbackConfigChange={setFeedbackConfig} onLoadMaterials={() => setMaterialsLoaded(true)} onStartAnalysis={startAnalysis} />
                  </div>
                  {startPhonePreview ? <StartPhoneSimulator config={feedbackConfig} /> : null}
                </div>
              ) : stage === 5 ? (
                <div className="h-full overflow-auto">
                  <FinalResultView nodes={nodes} edges={edges} signals={crowdSignals} result={roundResult} onModify={(node) => setEditingNode(node)} onRegenerate={regenerate} />
                </div>
              ) : (
                workbench
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {stage !== 5 && stage !== 0 && roundState === "running" ? (
        <div className="fixed bottom-7 right-24 z-40 flex gap-3">
          <Button variant="pink" onClick={onOpenGroupFeedback}><MessageSquare size={18} />模拟完成并查看结果</Button>
        </div>
      ) : null}
      {toast ? <Toast text={toast} onClose={() => setToast("")} /> : null}
      {editingNode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xl">
          <div className="glass-modal w-[520px] rounded-[24px] p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800">修改方案 · {editingNode.candidate.title}</h2>
              <button onClick={() => setEditingNode(null)} className="rounded-full p-2 hover:bg-slate-100"><X /></button>
            </div>
            <img src={editingNode.candidate.imageUrl} alt="" className="mb-4 h-40 w-40 rounded-2xl object-cover" />
            <Textarea value={editText} onChange={(event) => setEditText(event.target.value)} placeholder="输入修改意见，例如：表情更亲切，减少锅具夸张度..." />
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingNode(null)}>取消</Button>
              <Button variant="gradient" onClick={submitEdit}>提交修改</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StartPhoneSimulator({ config }: { config: FeedbackConfig }) {
  return (
    <aside className="absolute bottom-5 right-7 top-5 z-20 flex w-[300px] flex-col justify-center">
      <div className="mb-3 px-1">
        <div className="text-sm font-black text-slate-900">手机端预览</div>
        <div className="mt-0.5 text-xs font-bold text-slate-500">实时查看参与者填写流程</div>
      </div>
      <div className="relative h-[614px] w-[283px] overflow-hidden rounded-[24px] border border-[#7D8FAF]/55 bg-[#EFF6FF] shadow-[0_16px_38px_rgba(42,70,130,0.14)]">
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-4 w-20 -translate-x-1/2 rounded-b-2xl bg-slate-900/12" />
        <div className="h-[852px] w-[393px]" style={{ transform: "scale(0.72)", transformOrigin: "top left" }}>
          <MobileFeedbackSimulator config={config} previewMode />
        </div>
      </div>
    </aside>
  );
}

function routeToStage(pathname: string): StageKey {
  if (pathname === "/group-feedback") return 3;
  if (pathname === "/third-round-feedback") return 4;
  if (pathname === "/fourth-round-feedback") return 5;
  if (pathname === "/workspace") return 2;
  if (pathname === "/analysis-preview") return 1;
  return 0;
}

function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-modal fixed right-8 top-36 z-50 max-w-[420px] rounded-2xl p-5 text-base font-semibold text-slate-700">
      {text}
      <button className="ml-4 text-blue-600" onClick={onClose}>知道了</button>
    </motion.div>
  );
}

export default App;

// 某阶段「首次进入」时的画布初始形态。之后该阶段的所有操作都会沉淀进快照，
// 切回时优先还原快照而非再次套用此模板，从而保持各页面初次使用后的最终形态。
function stageCanvasTemplate(stage: StageKey, currentRoundState: WorkspaceRoundState): StageCanvasSnapshot {
  if (stage === 4) {
    // 演化树：初始方案 + 子代方案，沿用当前轮次状态
    return { nodes: [...initialNodes, ...childNodes], edges: childEdges, roundState: currentRoundState };
  }
  if (stage === 5) {
    // 群体结果：优选首方案 + 子代，轮次标记完成
    return { nodes: [...initialNodes.slice(0, 1), ...childNodes], edges: childEdges, roundState: "completed" };
  }
  // 输入素材(0) / 初始方案(2) 等：候选图案画布
  return { nodes: initialNodes, edges: [], roundState: "none" };
}
