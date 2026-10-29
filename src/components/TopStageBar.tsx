import { Activity, CheckCircle2, CircleDot } from "lucide-react";
import type { StageStatus } from "../types";

export function TopStageBar({ status }: { status: StageStatus }) {
  const statusCopy =
    status.roundStatus === "completed"
      ? "已完成"
      : status.roundStatus === "running"
        ? "进行中"
        : "待开始";
  const StatusIcon = status.roundStatus === "completed" ? CheckCircle2 : status.roundStatus === "running" ? Activity : CircleDot;

  return (
    <div className="flex h-14 items-center justify-between border-b border-white/45 bg-white/28 pl-40 pr-6 text-slate-800 shadow-[0_8px_30px_rgba(74,100,160,0.08)] backdrop-blur-2xl">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-white/42 text-[var(--color-brand-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          <StatusIcon size={16} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">当前阶段</div>
          <div className="truncate text-sm font-black text-slate-800">{status.stageLabel}</div>
        </div>
      </div>
      <div className="rounded-full border border-white/50 bg-white/32 px-3 py-1.5 text-xs font-black text-[var(--color-brand-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        {statusCopy}
      </div>
    </div>
  );
}
