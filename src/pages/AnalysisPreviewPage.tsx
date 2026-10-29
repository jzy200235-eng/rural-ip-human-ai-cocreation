import { useMemo } from "react";
import { ModelAnalysisPanel } from "../components/ModelAnalysisPanel";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { materials, opinions, projectInfo } from "../data/mockData";
import { AnalysisPreviewPanel } from "../components/AnalysisPreviewPanel";
import { ANALYSIS_PREVIEW_STORAGE_KEY, buildAnalysisPayload, type AnalysisPayload } from "../lib/analysisPreview";
import { WorkflowStepper } from "../components/WorkflowStepper";
import { TopStageBar } from "../components/TopStageBar";
import { Button } from "../components/ui/button";
import type { StageKey, StageStatus } from "../types";

const ANALYSIS_STATUS: StageStatus = {
  currentStage: 1,
  stageLabel: "阶段 1：可溯源分析",
  roundStatus: "none",
  participants: { villagers: 0, business: 0 },
};

export function AnalysisPreviewPage({ maxVisitedStage, onBack, onBackHome, onContinue, onOpenStart, onOpenWorkspace, onOpenGroupFeedback, onOpenThirdRound, onOpenFourthRound, onOpenFinalConfirmation }: { maxVisitedStage: StageKey; onBack: () => void; onBackHome: () => void; onContinue: () => void; onOpenStart: () => void; onOpenWorkspace: () => void; onOpenGroupFeedback: () => void; onOpenThirdRound: () => void; onOpenFourthRound: () => void; onOpenFinalConfirmation: () => void }) {
  const payload = useMemo(() => readPayload(), []);
  const opinionStats = buildOpinionStats(payload);

  const handleSelectStage = (stage: StageKey) => {
    if (stage > maxVisitedStage) return;
    if (stage === 0) { onOpenStart(); return; }
    if (stage === 1) return;
    if (stage === 2) { onOpenWorkspace(); return; }
    if (stage === 3) { onOpenGroupFeedback(); return; }
    if (stage === 4) { onOpenThirdRound(); return; }
    if (stage === 5) { onOpenFourthRound(); return; }
    onOpenWorkspace();
  };

  return (
    <div className="glass-page-bg h-screen overflow-hidden">
      <button type="button" onClick={onBackHome} className="app-nav-home">
        <ArrowLeft size={16} /> 返回首页
      </button>
      <TopStageBar status={ANALYSIS_STATUS} />
      <div className="grid h-[calc(100vh-56px)] min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
        <WorkflowStepper currentStage={1} maxVisitedStage={maxVisitedStage} onBack={onBack} onSelectStage={handleSelectStage} onOpenFinalConfirmation={onOpenFinalConfirmation} />
        <main className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[1380px] space-y-0">
          <section className="glass-panel rounded-b-none rounded-t-[24px] border-b-0 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">分析结果</h1>
                <Button variant="gradient" size="md" onClick={onContinue} className="h-10 w-full rounded-[14px] px-5 text-sm shadow-[0_14px_30px_rgba(49,95,232,0.24)] sm:w-auto">
                  确认并继续 <ArrowRight size={15} />
                </Button>
              </div>
              <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                查看工作流、溯源矩阵与素材转译，确认后进入初始方案工作台。
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-2 rounded-[20px] border border-white/60 bg-white/35 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-slate-600">
                  <CheckCircle2 size={13} className="text-green-500" /> 意见统计
                </span>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-[var(--color-brand-primary)]">总人数 {opinionStats.totalParticipants} 人</span>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-slate-600">文字 {opinionStats.textCount} 条</span>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-slate-600">图片 {opinionStats.imageCount} 张</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {opinionStats.groups.map((group) => (
                  <span key={group.name} className="rounded-full bg-white/50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                    {group.name} · {group.count}人
                  </span>
                ))}
              </div>
            </div>
          </section>

          <ModelAnalysisPanel payload={payload} />
          <AnalysisPreviewPanel payload={payload} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function buildOpinionStats(payload: AnalysisPayload) {
  const groups = payload.textSources.reduce<Record<string, number>>((acc, item) => {
    const name = item.role || item.speaker || "参与者";
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const imageCount = payload.imageSources.filter((item) => item.url || item.type.includes("图片")).length;
  const textCount = payload.textSources.length;

  return {
    totalParticipants: Math.max(textCount, Object.values(groups).reduce((sum, count) => sum + count, 0)),
    textCount,
    imageCount,
    groups: Object.entries(groups).map(([name, count]) => ({ name, count })),
  };
}

function readPayload(): AnalysisPayload {
  try {
    const raw = window.sessionStorage.getItem(ANALYSIS_PREVIEW_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AnalysisPayload;
  } catch (error) {
    console.warn("Failed to read analysis payload", error);
  }

  return buildAnalysisPayload({
    project: projectInfo,
    textSources: opinions.map((item, index) => ({
      id: `T${String(index + 1).padStart(3, "0")}`,
      speaker: `${item.role}代表`,
      role: item.role,
      importance: index === 0 ? "high" : "normal",
      relatedImages: "",
      content: item.content,
    })),
    imageSources: materials.map((item, index) => ({
      id: item.id.startsWith("IMG") ? item.id : `IMG${String(index + 1).padStart(3, "0")}`,
      name: item.title,
      type: item.type === "image" ? "图片素材" : "文字素材",
      description: item.note,
      culture: item.note,
      url: item.url,
    })),
    useCases: ["文创", "导视", "活动海报", "表情包"],
  });
}
