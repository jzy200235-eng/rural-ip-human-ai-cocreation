import { ArrowLeft, Check, CircleDot } from "lucide-react";
import type { StageKey } from "../types";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { readFinalSelectionRecord } from "../lib/finalSelection";

const steps: { key: StageKey; title: string }[] = [
  { key: 0, title: "输入素材" },
  { key: 1, title: "溯源分析" },
  { key: 2, title: "初始方案" },
  { key: 3, title: "第一轮" },
  { key: 4, title: "第二轮" },
  { key: 5, title: "第四轮" },
];

interface Props {
  currentStage: StageKey;
  maxVisitedStage: StageKey;
  onBack: () => void;
  onSelectStage: (stage: StageKey) => void;
  onOpenFinalConfirmation?: () => void;
  finalConfirmationActive?: boolean;
  // 按使用场景覆盖某步骤的大标题（如 group-feedback 页将「第一轮」改为「第二轮意见收集」），不影响其他页面
  titleOverrides?: Partial<Record<StageKey, string>>;
}

export function WorkflowStepper({ currentStage, maxVisitedStage, onBack, onSelectStage, onOpenFinalConfirmation, finalConfirmationActive = false, titleOverrides }: Props) {
  const currentIndex = steps.findIndex((step) => step.key === currentStage);
  const canBack = currentIndex > 0;
  const finalSelection = readFinalSelectionRecord();
  const showFinalStep = finalSelection.plans.length > 0 && Boolean(onOpenFinalConfirmation);
  const visibleSteps = showFinalStep ? steps.filter((step) => step.key <= finalSelection.confirmedStage) : steps;

  return (
    <aside className="glass-panel h-full w-[220px] shrink-0 overflow-y-auto rounded-none border-y-0 border-l-0 px-3 py-4 shadow-[12px_0_34px_rgba(66,91,150,0.08)]">
      <div className="rounded-[18px] border border-white/50 bg-white/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
        <h2 className="text-base font-black text-[var(--color-text-strong)]">共创流程</h2>
        <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">按阶段推进项目</p>
      </div>

      <Button variant="outline" size="sm" className="mt-3 w-full rounded-2xl" onClick={onBack} disabled={!canBack}>
        <ArrowLeft size={15} />
        上一步
      </Button>

      <div className="mt-4 space-y-2">
        {visibleSteps.map((step, index) => {
          const isCurrent = step.key === currentStage;
          const isDone = step.key < currentStage || step.key <= maxVisitedStage;
          // 严格顺序解锁：仅已抵达过的阶段可点击，未解锁项保持灰色禁用（含「溯源分析」，不再特例放行）
          const isReachable = step.key <= maxVisitedStage;
          const title = titleOverrides?.[step.key] ?? step.title;
          return (
            <div key={step.key} className="space-y-1.5">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => onSelectStage(step.key)}
                className={cn(
                  "group relative flex w-full items-center gap-2 rounded-[16px] border px-3 py-3 text-left transition",
                  isCurrent
                    ? "border-white/70 bg-white/48 shadow-[0_10px_28px_rgba(72,107,190,0.12)]"
                    : "border-white/40 bg-white/22 hover:bg-white/40",
                  !isReachable && "cursor-not-allowed opacity-40 hover:bg-white/22",
                )}
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black", isCurrent ? "bg-[var(--color-brand-primary)] text-white" : isDone ? "bg-[var(--color-status-success)] text-white" : "bg-white/45 text-[var(--color-text-muted)]")}>
                  {isCurrent ? <CircleDot size={14} /> : isDone ? <Check size={14} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-xs font-black", isCurrent ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-default)]")}>{title}</span>
                </span>
              </button>
              {showFinalStep && finalSelection.confirmedStage === step.key ? (
                <button
                  type="button"
                  onClick={onOpenFinalConfirmation}
                  className={cn(
                    "group relative flex w-full items-center gap-2 rounded-[16px] border px-3 py-3 text-left transition",
                    finalConfirmationActive
                      ? "border-white/70 bg-white/48 shadow-[0_10px_28px_rgba(72,107,190,0.12)]"
                      : "border-white/40 bg-white/22 hover:bg-white/40",
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black", finalConfirmationActive ? "bg-[var(--color-brand-primary)] text-white" : "bg-[var(--color-status-success)] text-white")}>
                    {finalConfirmationActive ? <CircleDot size={14} /> : <Check size={14} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-xs font-black", finalConfirmationActive ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-default)]")}>确认最终方案</span>
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
