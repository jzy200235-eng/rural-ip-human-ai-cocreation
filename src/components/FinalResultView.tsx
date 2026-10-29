import { TrendingUp } from "lucide-react";
import type { CrowdSignal, EvolutionEdge, EvolutionNode, RoundResult } from "../types";
import { EvolutionCanvas } from "./EvolutionCanvas";
import { TagFeedbackPanel } from "./TagFeedbackPanel";
import { VotingDistribution } from "./VotingDistribution";

interface Props {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  signals: CrowdSignal[];
  result: RoundResult;
  onModify: (node: EvolutionNode) => void;
  onRegenerate: (node: EvolutionNode) => void;
}

export function FinalResultView({ nodes, edges, signals, result, onModify, onRegenerate }: Props) {
  return (
    <main className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_330px] overflow-hidden bg-transparent">
      <EvolutionCanvas nodes={nodes} edges={edges} signals={signals} finalMode onModify={onModify} onRegenerate={onRegenerate} />
      <aside className="glass-panel min-h-0 overflow-y-auto rounded-none border-y-0 border-r-0 px-5 py-5">
        <div className="rounded-[20px] app-gradient-primary p-5 text-white shadow-[0_16px_36px_rgba(74,106,218,0.24)]">
          <h2 className="flex items-center gap-3 text-2xl font-bold">
            <TrendingUp size={26} />
            实时群体信号
          </h2>
          <p className="mt-3 text-sm font-semibold">实时投票反馈</p>
        </div>
        <div className="mt-5 space-y-5">
          <VotingDistribution result={result} />
          <TagFeedbackPanel result={result} />
          <div className="glass-card rounded-[18px] p-4 text-sm font-semibold leading-6 text-[var(--color-text-default)]">
            群体反馈已回流到创作者工作室，可继续基于优选方案进行下一代生成。
          </div>
        </div>
      </aside>
    </main>
  );
}
