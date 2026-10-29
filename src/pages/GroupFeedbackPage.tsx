import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { childCandidates, crowdSignals, initialNodes, roundConfig, roundResult } from "../data/mockData";
import { EvolutionCanvas } from "../components/EvolutionCanvas";
import { RoundManagementPanel } from "../components/RoundManagementPanel";
import { WorkflowStepper } from "../components/WorkflowStepper";
import { TopStageBar } from "../components/TopStageBar";
import { loadWorkspaceState } from "../lib/workspaceState";
import { saveFinalSelection } from "../lib/finalSelection";
import { isSelectableParent } from "../lib/evolutionModel";
import type { CrowdSignal, EvolutionEdge, EvolutionNode, StageKey, StageStatus } from "../types";

const GROUP_FEEDBACK_STATUS: StageStatus = {
  currentStage: 3,
  stageLabel: "第一轮",
  roundId: roundResult.roundId,
  roundStatus: "completed",
  participants: { villagers: 45, business: 28 },
};

// 树状布局常量：富卡片尺寸与父代/子代分层间距。每个父代各自演化出一整组 4 个子代，按簇排列，
// 父代居中其子代簇之上；簇与簇之间留足横向间距，确保父子关系一目了然且任意卡片之间不重叠。
const RICH_CARD_W = 288;
const RICH_CARD_H = 416;
const CHILD_GAP = 52;            // 同一父代下相邻子代的横向间距
const CLUSTER_GAP = 232;         // 不同父代簇（家族）之间的横向间距，留出明显分隔
const THIRD_CHILD_GAP = 76;      // 第三轮同一父代下相邻方案的横向间距，避免连线交叉
const THIRD_BRANCH_GAP = 128;    // 不同第二轮父代分支之间的横向间距，确保子树互不重叠
const PARENT_ROW_Y = 150;        // 第一轮父代所在行
const CHILD_ROW_Y = PARENT_ROW_Y + RICH_CARD_H + 210; // 第二轮子代行：加深父子纵向缩进，强化进化层级
const THIRD_ROW_GAP = 280;       // 第三轮方案与第二轮卡片之间的纵向间距
const LAYOUT_START_X = 160;
const THIRD_ROUND_SELECTION_KEY = "collaborative-platform.third-round-selection";
const FOURTH_ROUND_SELECTION_KEY = "collaborative-platform.fourth-round-selection";

// 父代 = 用户在 /workspace 画布中「勾选确认」的方案（第一轮里被选中的方案，含其同轮局部调整）；
// 无勾选记录时回落为前两个初始方案，保证页面始终有可演示的父代。
// 统一归一化为本视图「第一轮父代」：generation 0、清除历史坐标与派生标记，交由画布按轮次行布局，并标记 selected 以呈现「已确认」徽标。
function resolveParentNodes(): EvolutionNode[] {
  const persisted = loadWorkspaceState();
  const selected = (persisted?.nodes ?? []).filter((node) => isSelectableParent(node) && node.selected);
  const source = selected.length > 0 ? selected : initialNodes.slice(0, 2);
  return source.map((node) => ({ ...node, generation: 0, kind: undefined, x: undefined, y: undefined, selected: true }));
}

// 子代 = 接入手机端「交互式进化计算」并完成结果汇总后产出的**第二轮方案**。
// 这是唯一推进轮次的路径：标记 kind:"evolved" 且 generation = 1，区别于 workspace 的同轮局部调整。
// 每个确认父代各自演化出一整组 4 个子代（与初始方案数量一致），形成「父代 → 4 子代」的对称分叉，
// 子代归属唯一明确、轮次推进清晰；以富卡片渲染，但通过虚线描边、强调色底与交互反馈区别于父代。
function buildChildNodes(parents: EvolutionNode[]): EvolutionNode[] {
  const nodes: EvolutionNode[] = [];
  parents.forEach((parent, parentIndex) => {
    childCandidates.forEach((base, childIndex) => {
      const signal = crowdSignals[childIndex % crowdSignals.length];
      const tags = (signal?.tags ?? []).slice(0, 3).map((tag) => tag.label);
      const id = `gf-child-${parentIndex + 1}-${childIndex + 1}`;
      nodes.push({
        id,
        generation: 1,
        stage: "形状",
        kind: "evolved" as const,
        parentId: parent.id,
        selected: false,
        candidate: {
          id,
          title: base.title,
          imageUrl: base.imageUrl,
          promptTrace: [...base.promptTrace, `群体交互进化：汇总 ${signal?.totalVotes ?? 0} 票`],
          description: base.description,
          // 方向编号取形状序号（A/B/C/D），方向名标注为「群体进化」子代，外观字段与父代富卡片对齐
          directionCode: base.title.replace("形状-", ""),
          directionName: `${base.title} · 群体进化`,
          tagline: base.description,
          keywords: tags.length > 0 ? tags : parent.candidate.keywords,
          consensus: signal ? Math.min(100, Math.round((signal.totalVotes / 56) * 100)) : parent.candidate.consensus ?? 0,
        },
      });
    });
  });
  return nodes;
}

export function GroupFeedbackPage({ maxVisitedStage, onBackHome, onBack, onOpenStart, onOpenWorkspace, onOpenAnalysis, onOpenThirdRound, onOpenFourthRound, onOpenFinalConfirmation }: { maxVisitedStage: StageKey; onBackHome: () => void; onBack: () => void; onOpenStart: () => void; onOpenWorkspace: () => void; onOpenAnalysis: () => void; onOpenThirdRound: () => void; onOpenFourthRound: () => void; onOpenFinalConfirmation: () => void }) {
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [secondSelectionMode, setSecondSelectionMode] = useState(false);
  const [selectedSecondIds, setSelectedSecondIds] = useState<string[]>([]);
  const [thirdRoundRunning, setThirdRoundRunning] = useState(false);
  const [finalSelectionMode, setFinalSelectionMode] = useState(false);
  const [finalSelectedIds, setFinalSelectedIds] = useState<string[]>([]);

  // 父代取自 workspace 勾选（第一轮确认的方案）；据此演化出第二轮 4 个子代、建立父子连线与子代固定位置
  const parentNodes = useMemo(() => resolveParentNodes(), []);
  const childPlanNodes = useMemo(() => buildChildNodes(parentNodes), [parentNodes]);
  const selectedSecondIdSet = useMemo(() => new Set(selectedSecondIds), [selectedSecondIds]);
  const displayChildNodes = useMemo(
    () => childPlanNodes.map((node) => ({ ...node, selected: selectedSecondIdSet.has(node.id) })),
    [childPlanNodes, selectedSecondIdSet],
  );
  const finalSelectedIdSet = useMemo(() => new Set(finalSelectedIds), [finalSelectedIds]);
  const treeNodes = useMemo(() => {
    const nodes = [...parentNodes, ...displayChildNodes];
    return finalSelectionMode ? nodes.map((node) => ({ ...node, selected: finalSelectedIdSet.has(node.id) })) : nodes;
  }, [parentNodes, displayChildNodes, finalSelectionMode, finalSelectedIdSet]);
  const finalSelectableNodeIds = useMemo(() => [...parentNodes, ...displayChildNodes].map((node) => node.id), [parentNodes, displayChildNodes]);
  const childSignals = useMemo<CrowdSignal[]>(
    () => childPlanNodes.map((child, index) => ({ ...(crowdSignals[index % crowdSignals.length] ?? crowdSignals[0]), candidateId: child.id })),
    [childPlanNodes],
  );
  const secondRoundSummary = useMemo(() => (
    <div className="flex max-w-[860px] flex-wrap items-center gap-2 rounded-2xl border border-white/75 bg-white/84 px-3 py-2 text-[10px] font-bold leading-none text-[#53638d] shadow-[0_10px_28px_rgba(74,100,160,0.12)] backdrop-blur-xl">
      <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 font-black text-[#4f63a9]">意见 {roundResult.totalParticipants} 人</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">村民 {roundResult.villagers}</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">游客 {roundResult.tourists}</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">商户 {roundResult.merchants}</span>
      <span className="mx-1 h-3 w-px bg-[#dfe6ff]" />
      <span className="rounded-full bg-[#f8faff] px-2.5 py-1 font-black text-[#4f63a9]">方案 {childPlanNodes.length} 组</span>
      <span className="text-[10px] font-semibold leading-none text-[#66759f]">根据大众意见进行前四名的方案展现</span>
    </div>
  ), [childPlanNodes.length]);

  // 父子连线：每个第二轮子代连回其归属父代，呈现从第一轮到第二轮的树状进化与轮次连续性
  const treeEdges = useMemo<EvolutionEdge[]>(
    () => childPlanNodes.map((child) => ({ id: `gf-edge-${child.id}`, source: child.parentId ?? parentNodes[0].id, target: child.id })),
    [childPlanNodes, parentNodes],
  );

  // 树状布局：为父代与子代统一计算坐标。子代按所属父代分簇平铺，父代水平居中于自身子代簇之上，
  // 簇间留足间距——父子归属一眼可辨，且父代行与子代行之间垂直分层、互不重叠。
  const initialPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    let cursorX = LAYOUT_START_X;
    parentNodes.forEach((parent) => {
      const kids = childPlanNodes.filter((child) => child.parentId === parent.id);
      const count = Math.max(1, kids.length);
      const clusterWidth = count * RICH_CARD_W + (count - 1) * CHILD_GAP;
      kids.forEach((kid, kidIndex) => {
        map[kid.id] = { x: cursorX + kidIndex * (RICH_CARD_W + CHILD_GAP), y: CHILD_ROW_Y };
      });
      // 父代居中对齐到其子代簇中线
      map[parent.id] = { x: cursorX + (clusterWidth - RICH_CARD_W) / 2, y: PARENT_ROW_Y };
      cursorX += clusterWidth + CLUSTER_GAP;
    });
    return map;
  }, [parentNodes, childPlanNodes]);

  const selectedPlans = useMemo(
    () => displayChildNodes
      .filter((node) => node.selected)
      .map((node, index) => ({ id: node.id, index: index + 1, title: node.candidate.directionName ?? node.candidate.title })),
    [displayChildNodes],
  );

  const handleToggleSecondPlan = (node: EvolutionNode) => {
    if (finalSelectionMode) {
      setFinalSelectedIds((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
      return;
    }
    if (node.generation !== 1) return;
    setSelectedSecondIds((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
  };

  const confirmFinalSelection = () => {
    if (finalSelectedIds.length === 0) return;
    saveFinalSelection(treeNodes, finalSelectedIds, 3);
    onOpenFinalConfirmation();
  };

  const openCoCreationPanel = () => {
    setPanelOpen((value) => !value);
    setSecondSelectionMode(true);
  };

  const openThirdRound = () => {
    window.sessionStorage.setItem(THIRD_ROUND_SELECTION_KEY, JSON.stringify(selectedSecondIds));
    onOpenThirdRound();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  // 本页对应左侧「第一轮」。所有流程项都走明确路由，避免落回 workspace 的旧内部阶段。
  const handleSelectStage = (stage: StageKey) => {
    if (stage > maxVisitedStage) return;
    if (stage === 0) { onOpenStart(); return; }
    if (stage === 1) { onOpenAnalysis(); return; }
    if (stage === 2) { onOpenWorkspace(); return; }
    if (stage === 3) return;
    if (stage === 4) { onOpenThirdRound(); return; }
    if (stage === 5) { onOpenFourthRound(); return; }
    onOpenWorkspace();
  };

  return (
    <div className="glass-page-bg h-screen overflow-hidden">
      <button type="button" onClick={onBackHome} className="app-nav-home">
        <ArrowLeft size={16} /> 返回首页
      </button>
      <TopStageBar status={GROUP_FEEDBACK_STATUS} />
      <div className="grid h-[calc(100vh-56px)] min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
        <WorkflowStepper currentStage={3} maxVisitedStage={maxVisitedStage} onBack={onBack} onSelectStage={handleSelectStage} onOpenFinalConfirmation={onOpenFinalConfirmation} />
        <div className="min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="flex h-full flex-col items-center justify-center gap-5 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="relative flex size-20 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[var(--color-brand-primary)]/12" />
                  <Loader2 size={40} className="animate-spin text-[var(--color-brand-primary)]" />
                </span>
                <div>
                  <div className="text-lg font-black text-slate-800">正在汇总群体交互进化结果…</div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    正在汇总移动端投票、偏好评价与标签反馈，由原有方案演化生成子代方案。
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="size-2 rounded-full bg-[var(--color-brand-primary)]"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18 }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                className="h-full min-h-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {/* 与 /workspace 工作台完全一致的画布容器 + 右侧共创边栏 */}
                <main className="relative h-full min-h-0 overflow-hidden bg-transparent">
                  <EvolutionCanvas
                    nodes={treeNodes}
                    edges={treeEdges}
                    signals={childSignals}
                    initialPositions={initialPositions}
                    roundSummaries={{ 1: secondRoundSummary }}
                    groupTotals={{ villagers: roundResult.villagers, merchants: roundResult.merchants, tourists: roundResult.tourists }}
                    autoFit
                    readOnly
                    selectionMode={secondSelectionMode || finalSelectionMode}
                    selectableNodeIds={finalSelectionMode ? finalSelectableNodeIds : undefined}
                    onToggleSelect={handleToggleSecondPlan}
                    onModify={() => undefined}
                    onRegenerate={() => undefined}
                    title="方案汇总"
                    subtitle="第二轮：群体交互进化结果"
                    description="已汇总移动端交互式进化投票，由第一轮中确认的方案（父代）各自演化生成第二轮 4 个子代方案；画布通过纵向缩进、箭头连线、父子卡片样式与悬停/聚焦反馈呈现清晰的树状进化关系。"
                    roundLabels={{ 0: "第一轮 · 已确认父代", 1: "第二轮" }}
                  />
                  <RoundManagementPanel
                    initialConfig={roundConfig}
                    running={thirdRoundRunning}
                    selectedPlans={selectedPlans}
                    targetStageLabel="第三轮"
                    selectionHint="请在画布中勾选要进入第三轮意见收集的第二轮方案（可多选）。"
                    confirmedMessage="将选中的第二轮方案作为新一轮父代方案发送给多主体继续评价。"
                    onStartRound={() => setThirdRoundRunning(true)}
                    onViewResults={openThirdRound}
                    open={panelOpen}
                    onToggle={openCoCreationPanel}
                    finalSelectionActive={finalSelectionMode}
                    finalSelectedCount={finalSelectedIds.length}
                    onToggleFinalSelection={() => setFinalSelectionMode(true)}
                    onConfirmFinalSelection={confirmFinalSelection}
                  />
                </main>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function readStoredSelection(key: string): string[] {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function readThirdRoundSelection(): string[] {
  return readStoredSelection(THIRD_ROUND_SELECTION_KEY);
}

function readFourthRoundSelection(): string[] {
  return readStoredSelection(FOURTH_ROUND_SELECTION_KEY);
}

function buildThirdRoundNodes(parents: EvolutionNode[]): EvolutionNode[] {
  const sourceParents = parents.length > 0 ? parents : initialNodes.slice(0, 1);
  const nodes: EvolutionNode[] = [];

  sourceParents.forEach((parent, parentIndex) => {
    childCandidates.slice(0, 3).forEach((base, childIndex) => {
      const signal = crowdSignals[(parentIndex * 3 + childIndex) % crowdSignals.length];
      const id = `gf-third-${parentIndex + 1}-${childIndex + 1}`;
      nodes.push({
        id,
        generation: 2,
        stage: "表达",
        kind: "evolved" as const,
        parentId: parent.id,
        selected: false,
        candidate: {
          id,
          title: `三代-${parentIndex + 1}-${base.title.replace("形状-", "")}`,
          imageUrl: base.imageUrl,
          promptTrace: [...base.promptTrace, `第三轮意见收集：汇总 ${signal?.totalVotes ?? 0} 票`],
          description: `${base.description}（第三轮融合版）`,
          directionCode: `${base.title.replace("形状-", "")}₃`,
          directionName: `${base.title} · 第三代总结`,
          tagline: `${base.description}，融合第二轮反馈后进一步收敛。`,
          keywords: (signal?.tags ?? []).slice(0, 3).map((tag) => tag.label),
          consensus: signal ? Math.min(100, Math.round((signal.totalVotes / 56) * 92)) : 72,
        },
      });
    });
  });

  return nodes;
}

export function ThirdRoundFeedbackPage({ maxVisitedStage, onBackHome, onBack, onOpenStart, onOpenWorkspace, onOpenAnalysis, onOpenGroupFeedback, onOpenFourthRound, onOpenFinalConfirmation }: { maxVisitedStage: StageKey; onBackHome: () => void; onBack: () => void; onOpenStart: () => void; onOpenWorkspace: () => void; onOpenAnalysis: () => void; onOpenGroupFeedback: () => void; onOpenFourthRound: () => void; onOpenFinalConfirmation: () => void }) {
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [nextRoundRunning, setNextRoundRunning] = useState(false);
  const [selectedThirdPlanIds, setSelectedThirdPlanIds] = useState<string[]>([]);
  const [finalSelectionMode, setFinalSelectionMode] = useState(false);
  const [finalSelectedIds, setFinalSelectedIds] = useState<string[]>([]);
  const parentNodes = useMemo(() => resolveParentNodes(), []);
  const allSecondNodes = useMemo(() => buildChildNodes(parentNodes), [parentNodes]);
  const selectedThirdIds = useMemo(() => readThirdRoundSelection(), []);
  const selectedSecondNodes = useMemo(() => {
    const selected = allSecondNodes.filter((node) => selectedThirdIds.includes(node.id));
    return selected.length > 0 ? selected : allSecondNodes.slice(0, 2);
  }, [allSecondNodes, selectedThirdIds]);
  const selectedSecondIdSet = useMemo(() => new Set(selectedSecondNodes.map((node) => node.id)), [selectedSecondNodes]);
  const displaySecondNodes = useMemo(
    () => allSecondNodes.map((node) => ({ ...node, selected: selectedSecondIdSet.has(node.id) })),
    [allSecondNodes, selectedSecondIdSet],
  );
  const thirdNodes = useMemo(() => buildThirdRoundNodes(selectedSecondNodes), [selectedSecondNodes]);
  const selectableThirdNodeIds = useMemo(() => thirdNodes.map((node) => node.id), [thirdNodes]);
  const selectedThirdIdSet = useMemo(() => new Set(selectedThirdPlanIds), [selectedThirdPlanIds]);
  const displayThirdNodes = useMemo(
    () => thirdNodes.map((node) => ({ ...node, selected: selectedThirdIdSet.has(node.id) })),
    [thirdNodes, selectedThirdIdSet],
  );
  const selectedPlans = useMemo(
    () => displayThirdNodes
      .filter((node) => node.selected)
      .map((node, index) => ({ id: node.id, index: index + 1, title: node.candidate.title })),
    [displayThirdNodes],
  );
  const mutedPreviousNodeIds = useMemo(
    () => displaySecondNodes.filter((node) => !node.selected).map((node) => node.id),
    [displaySecondNodes],
  );
  // 第三轮页面需要完整保留第二代横向全貌：未被选中的第二轮方案也继续展示在画布中；第三代只从已选第二轮方案继续分叉。
  const finalSelectedIdSet = useMemo(() => new Set(finalSelectedIds), [finalSelectedIds]);
  const treeNodes = useMemo(() => {
    const nodes = [...parentNodes, ...displaySecondNodes, ...displayThirdNodes];
    return finalSelectionMode ? nodes.map((node) => ({ ...node, selected: finalSelectedIdSet.has(node.id) })) : nodes;
  }, [parentNodes, displaySecondNodes, displayThirdNodes, finalSelectionMode, finalSelectedIdSet]);
  const finalSelectableNodeIds = useMemo(() => [...parentNodes, ...displaySecondNodes, ...displayThirdNodes].map((node) => node.id), [parentNodes, displaySecondNodes, displayThirdNodes]);
  const thirdSignals = useMemo<CrowdSignal[]>(
    () => [...displaySecondNodes, ...displayThirdNodes].map((node, index) => ({ ...(crowdSignals[index % crowdSignals.length] ?? crowdSignals[0]), candidateId: node.id })),
    [displaySecondNodes, displayThirdNodes],
  );
  const treeEdges = useMemo<EvolutionEdge[]>(() => [
    ...allSecondNodes.map((child) => ({ id: `third-path-${child.id}`, source: child.parentId ?? parentNodes[0].id, target: child.id })),
    ...displayThirdNodes.map((child) => ({ id: `third-edge-${child.id}`, source: child.parentId ?? selectedSecondNodes[0]?.id ?? parentNodes[0].id, target: child.id })),
  ], [allSecondNodes, selectedSecondNodes, displayThirdNodes, parentNodes]);
  const initialPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    const secondY = CHILD_ROW_Y;
    const thirdY = CHILD_ROW_Y + RICH_CARD_H + THIRD_ROW_GAP;
    let cursorX = LAYOUT_START_X;

    parentNodes.forEach((parent) => {
      const seconds = allSecondNodes.filter((node) => node.parentId === parent.id);
      const slots = seconds.map((second) => {
        const thirds = thirdNodes.filter((node) => node.parentId === second.id);
        const thirdClusterWidth = thirds.length > 0
          ? thirds.length * RICH_CARD_W + (thirds.length - 1) * THIRD_CHILD_GAP
          : RICH_CARD_W;
        return { second, thirds, width: Math.max(RICH_CARD_W, thirdClusterWidth) };
      });
      const clusterWidth = slots.reduce((sum, slot, index) => sum + slot.width + (index > 0 ? THIRD_BRANCH_GAP : 0), 0);
      map[parent.id] = { x: cursorX + (clusterWidth - RICH_CARD_W) / 2, y: PARENT_ROW_Y };

      let slotX = cursorX;
      slots.forEach((slot) => {
        const secondX = slotX + (slot.width - RICH_CARD_W) / 2;
        map[slot.second.id] = { x: secondX, y: secondY };
        const thirdClusterWidth = slot.thirds.length > 0
          ? slot.thirds.length * RICH_CARD_W + (slot.thirds.length - 1) * THIRD_CHILD_GAP
          : RICH_CARD_W;
        const thirdStartX = slotX + (slot.width - thirdClusterWidth) / 2;
        slot.thirds.forEach((third, thirdIndex) => {
          map[third.id] = { x: thirdStartX + thirdIndex * (RICH_CARD_W + THIRD_CHILD_GAP), y: thirdY };
        });
        slotX += slot.width + THIRD_BRANCH_GAP;
      });
      cursorX += clusterWidth + CLUSTER_GAP;
    });
    return map;
  }, [parentNodes, allSecondNodes, thirdNodes]);
  const thirdRoundSummary = useMemo(() => (
    <div className="flex max-w-[760px] flex-wrap items-center gap-2 rounded-2xl border border-white/75 bg-white/84 px-3 py-2 text-[10px] font-bold leading-none text-[#53638d] shadow-[0_10px_28px_rgba(74,100,160,0.12)] backdrop-blur-xl">
      <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 font-black text-[#4f63a9]">第三轮意见收集</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">第二轮全量展示 {allSecondNodes.length} 组</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">已选 {selectedSecondNodes.length} 组继续生成</span>
      <span className="text-[10px] font-semibold leading-none text-[#66759f]">保留第二代全貌，并基于已选方案总结第三代候选方案</span>
    </div>
  ), [allSecondNodes.length, selectedSecondNodes.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const handleToggleThirdPlan = (node: EvolutionNode) => {
    if (finalSelectionMode) {
      setFinalSelectedIds((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
      return;
    }
    if (!selectableThirdNodeIds.includes(node.id)) return;
    setSelectedThirdPlanIds((current) => (
      current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]
    ));
  };

  const confirmFinalSelection = () => {
    if (finalSelectedIds.length === 0) return;
    saveFinalSelection(treeNodes, finalSelectedIds, 4);
    onOpenFinalConfirmation();
  };

  const openFourthRound = () => {
    window.sessionStorage.setItem(FOURTH_ROUND_SELECTION_KEY, JSON.stringify(selectedThirdPlanIds));
    onOpenFourthRound();
  };

  const handleSelectStage = (stage: StageKey) => {
    if (stage > maxVisitedStage) return;
    if (stage === 0) { onOpenStart(); return; }
    if (stage === 1) { onOpenAnalysis(); return; }
    if (stage === 2) { onOpenWorkspace(); return; }
    if (stage === 3) { onOpenGroupFeedback(); return; }
    if (stage === 4) return;
    onOpenWorkspace();
  };

  return (
    <div className="glass-page-bg h-screen overflow-hidden">
      <button type="button" onClick={onBackHome} className="app-nav-home">
        <ArrowLeft size={16} /> 返回首页
      </button>
      <TopStageBar status={{ ...GROUP_FEEDBACK_STATUS, currentStage: 4, stageLabel: "第二轮" }} />
      <div className="grid h-[calc(100vh-56px)] min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
        <WorkflowStepper currentStage={4} maxVisitedStage={maxVisitedStage} onBack={onBack} onSelectStage={handleSelectStage} onOpenFinalConfirmation={onOpenFinalConfirmation} titleOverrides={{ 3: "第二轮", 4: "第三轮" }} />
        <div className="min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="flex h-full flex-col items-center justify-center gap-5 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={40} className="animate-spin text-[var(--color-brand-primary)]" />
                <div className="text-lg font-black text-slate-800">正在汇总第三轮意见收集结果…</div>
              </motion.div>
            ) : (
              <motion.div key="result" className="h-full min-h-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <main className="relative h-full min-h-0 overflow-hidden bg-transparent">
                  <EvolutionCanvas
                    key={`third-round-layout-v3-${selectedSecondNodes.map((node) => node.id).join("-")}-${displayThirdNodes.length}`}
                    nodes={treeNodes}
                    edges={treeEdges}
                    signals={thirdSignals}
                    initialPositions={initialPositions}
                    roundSummaries={{ 2: thirdRoundSummary }}
                    groupTotals={{ villagers: roundResult.villagers, merchants: roundResult.merchants, tourists: roundResult.tourists }}
                    autoFit
                    readOnly
                    selectionMode={panelOpen || finalSelectionMode}
                    selectableNodeIds={finalSelectionMode ? finalSelectableNodeIds : selectableThirdNodeIds}
                    mutedNodeIds={mutedPreviousNodeIds}
                    onToggleSelect={handleToggleThirdPlan}
                    onModify={() => undefined}
                    onRegenerate={() => undefined}
                    title="第三轮意见收集"
                    subtitle="第三代：群体反馈总结"
                    description="已展示第一轮父代、第二轮意见收集路径，并基于第二轮方案继续总结第三代候选方案。"
                    roundLabels={{ 0: "第一轮 · 已确认父代", 1: "第二轮", 2: "第三轮" }}
                  />
                  <RoundManagementPanel
                    initialConfig={roundConfig}
                    running={nextRoundRunning}
                    selectedPlans={selectedPlans}
                    targetStageLabel="下一轮"
                    selectionHint="请在画布中勾选要继续发起共创的第三轮方案（可多选）。"
                    confirmedMessage="将选中的第三轮方案继续发送给多主体，作为下一轮共创的父代方案。"
                    onStartRound={() => setNextRoundRunning(true)}
                    onViewResults={openFourthRound}
                    open={panelOpen}
                    onToggle={() => setPanelOpen((current) => !current)}
                    finalSelectionActive={finalSelectionMode}
                    finalSelectedCount={finalSelectedIds.length}
                    onToggleFinalSelection={() => setFinalSelectionMode(true)}
                    onConfirmFinalSelection={confirmFinalSelection}
                  />
                </main>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function buildFourthRoundNodes(parents: EvolutionNode[]): EvolutionNode[] {
  const sourceParents = parents.length > 0 ? parents : initialNodes.slice(0, 1);
  const nodes: EvolutionNode[] = [];

  sourceParents.forEach((parent, parentIndex) => {
    childCandidates.slice(0, 2).forEach((base, childIndex) => {
      const signal = crowdSignals[(parentIndex * 2 + childIndex) % crowdSignals.length];
      const id = `gf-fourth-${parentIndex + 1}-${childIndex + 1}`;
      nodes.push({
        id,
        generation: 3,
        stage: "表达深化",
        kind: "evolved" as const,
        parentId: parent.id,
        selected: false,
        candidate: {
          id,
          title: `四代-${parentIndex + 1}-${base.title.replace("形状-", "")}`,
          imageUrl: base.imageUrl,
          promptTrace: [...base.promptTrace, `下一轮意见收集：汇总 ${signal?.totalVotes ?? 0} 票`],
          description: `${base.description}（继续收敛版）`,
          directionCode: `${base.title.replace("形状-", "")}₄`,
          directionName: `${base.title} · 继续深化`,
          tagline: `${base.description}，基于第三轮已选方案继续生成。`,
          keywords: (signal?.tags ?? []).slice(0, 3).map((tag) => tag.label),
          consensus: signal ? Math.min(100, Math.round((signal.totalVotes / 56) * 90)) : 70,
        },
      });
    });
  });

  return nodes;
}

export function FourthRoundFeedbackPage({ maxVisitedStage, onBackHome, onBack, onOpenStart, onOpenWorkspace, onOpenAnalysis, onOpenGroupFeedback, onOpenFinalConfirmation }: { maxVisitedStage: StageKey; onBackHome: () => void; onBack: () => void; onOpenStart: () => void; onOpenWorkspace: () => void; onOpenAnalysis: () => void; onOpenGroupFeedback: () => void; onOpenFinalConfirmation: () => void }) {
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [nextRoundRunning, setNextRoundRunning] = useState(false);
  const [selectedFourthPlanIds, setSelectedFourthPlanIds] = useState<string[]>([]);
  const [finalSelectionMode, setFinalSelectionMode] = useState(false);
  const [finalSelectedIds, setFinalSelectedIds] = useState<string[]>([]);
  const parentNodes = useMemo(() => resolveParentNodes(), []);
  const allSecondNodes = useMemo(() => buildChildNodes(parentNodes), [parentNodes]);
  const selectedThirdIds = useMemo(() => readThirdRoundSelection(), []);
  const selectedSecondNodes = useMemo(() => {
    const selected = allSecondNodes.filter((node) => selectedThirdIds.includes(node.id));
    return selected.length > 0 ? selected : allSecondNodes.slice(0, 2);
  }, [allSecondNodes, selectedThirdIds]);
  const selectedSecondIdSet = useMemo(() => new Set(selectedSecondNodes.map((node) => node.id)), [selectedSecondNodes]);
  const displaySecondNodes = useMemo(() => allSecondNodes.map((node) => ({ ...node, selected: selectedSecondIdSet.has(node.id) })), [allSecondNodes, selectedSecondIdSet]);
  const thirdNodes = useMemo(() => buildThirdRoundNodes(selectedSecondNodes), [selectedSecondNodes]);
  const selectedFourthParentIds = useMemo(() => readFourthRoundSelection(), []);
  const selectedThirdNodes = useMemo(() => {
    const selected = thirdNodes.filter((node) => selectedFourthParentIds.includes(node.id));
    return selected.length > 0 ? selected : thirdNodes.slice(0, 1);
  }, [thirdNodes, selectedFourthParentIds]);
  const selectedThirdIdSet = useMemo(() => new Set(selectedThirdNodes.map((node) => node.id)), [selectedThirdNodes]);
  const displayThirdNodes = useMemo(() => thirdNodes.map((node) => ({ ...node, selected: selectedThirdIdSet.has(node.id) })), [thirdNodes, selectedThirdIdSet]);
  const fourthNodes = useMemo(() => buildFourthRoundNodes(selectedThirdNodes), [selectedThirdNodes]);
  const selectableFourthNodeIds = useMemo(() => fourthNodes.map((node) => node.id), [fourthNodes]);
  const selectedFourthIdSet = useMemo(() => new Set(selectedFourthPlanIds), [selectedFourthPlanIds]);
  const displayFourthNodes = useMemo(() => fourthNodes.map((node) => ({ ...node, selected: selectedFourthIdSet.has(node.id) })), [fourthNodes, selectedFourthIdSet]);
  const selectedPlans = useMemo(() => displayFourthNodes.filter((node) => node.selected).map((node, index) => ({ id: node.id, index: index + 1, title: node.candidate.title })), [displayFourthNodes]);
  const mutedPreviousNodeIds = useMemo(() => [
    ...displaySecondNodes.filter((node) => !node.selected).map((node) => node.id),
    ...displayThirdNodes.filter((node) => !node.selected).map((node) => node.id),
  ], [displaySecondNodes, displayThirdNodes]);
  const finalSelectedIdSet = useMemo(() => new Set(finalSelectedIds), [finalSelectedIds]);
  const treeNodes = useMemo(() => {
    const nodes = [...parentNodes, ...displaySecondNodes, ...displayThirdNodes, ...displayFourthNodes];
    return finalSelectionMode ? nodes.map((node) => ({ ...node, selected: finalSelectedIdSet.has(node.id) })) : nodes;
  }, [parentNodes, displaySecondNodes, displayThirdNodes, displayFourthNodes, finalSelectionMode, finalSelectedIdSet]);
  const finalSelectableNodeIds = useMemo(() => [...parentNodes, ...displaySecondNodes, ...displayThirdNodes, ...displayFourthNodes].map((node) => node.id), [parentNodes, displaySecondNodes, displayThirdNodes, displayFourthNodes]);
  const fourthSignals = useMemo<CrowdSignal[]>(() => [...displaySecondNodes, ...displayThirdNodes, ...displayFourthNodes].map((node, index) => ({ ...(crowdSignals[index % crowdSignals.length] ?? crowdSignals[0]), candidateId: node.id })), [displaySecondNodes, displayThirdNodes, displayFourthNodes]);
  const treeEdges = useMemo<EvolutionEdge[]>(() => [
    ...allSecondNodes.map((child) => ({ id: `fourth-path-${child.id}`, source: child.parentId ?? parentNodes[0].id, target: child.id })),
    ...displayThirdNodes.map((child) => ({ id: `fourth-third-${child.id}`, source: child.parentId ?? selectedSecondNodes[0]?.id ?? parentNodes[0].id, target: child.id })),
    ...displayFourthNodes.map((child) => ({ id: `fourth-edge-${child.id}`, source: child.parentId ?? selectedThirdNodes[0]?.id ?? parentNodes[0].id, target: child.id })),
  ], [allSecondNodes, selectedSecondNodes, selectedThirdNodes, displayThirdNodes, displayFourthNodes, parentNodes]);
  const initialPositions = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    const secondY = CHILD_ROW_Y;
    const thirdY = CHILD_ROW_Y + RICH_CARD_H + THIRD_ROW_GAP;
    const fourthY = thirdY + RICH_CARD_H + THIRD_ROW_GAP;
    let cursorX = LAYOUT_START_X;

    parentNodes.forEach((parent) => {
      const seconds = allSecondNodes.filter((node) => node.parentId === parent.id);
      const secondSlots = seconds.map((second) => {
        const thirds = thirdNodes.filter((node) => node.parentId === second.id);
        const thirdSlots = thirds.map((third) => {
          const fourths = fourthNodes.filter((node) => node.parentId === third.id);
          const fourthClusterWidth = fourths.length > 0 ? fourths.length * RICH_CARD_W + (fourths.length - 1) * THIRD_CHILD_GAP : RICH_CARD_W;
          return { third, fourths, width: Math.max(RICH_CARD_W, fourthClusterWidth) };
        });
        const thirdClusterWidth = thirdSlots.length > 0 ? thirdSlots.reduce((sum, slot, index) => sum + slot.width + (index > 0 ? THIRD_BRANCH_GAP : 0), 0) : RICH_CARD_W;
        return { second, thirdSlots, width: Math.max(RICH_CARD_W, thirdClusterWidth) };
      });
      const clusterWidth = secondSlots.reduce((sum, slot, index) => sum + slot.width + (index > 0 ? THIRD_BRANCH_GAP : 0), 0);
      map[parent.id] = { x: cursorX + (clusterWidth - RICH_CARD_W) / 2, y: PARENT_ROW_Y };

      let secondSlotX = cursorX;
      secondSlots.forEach((secondSlot) => {
        map[secondSlot.second.id] = { x: secondSlotX + (secondSlot.width - RICH_CARD_W) / 2, y: secondY };
        const thirdClusterWidth = secondSlot.thirdSlots.length > 0 ? secondSlot.thirdSlots.reduce((sum, slot, index) => sum + slot.width + (index > 0 ? THIRD_BRANCH_GAP : 0), 0) : RICH_CARD_W;
        let thirdSlotX = secondSlotX + (secondSlot.width - thirdClusterWidth) / 2;
        secondSlot.thirdSlots.forEach((thirdSlot) => {
          map[thirdSlot.third.id] = { x: thirdSlotX + (thirdSlot.width - RICH_CARD_W) / 2, y: thirdY };
          const fourthClusterWidth = thirdSlot.fourths.length > 0 ? thirdSlot.fourths.length * RICH_CARD_W + (thirdSlot.fourths.length - 1) * THIRD_CHILD_GAP : RICH_CARD_W;
          const fourthStartX = thirdSlotX + (thirdSlot.width - fourthClusterWidth) / 2;
          thirdSlot.fourths.forEach((fourth, fourthIndex) => {
            map[fourth.id] = { x: fourthStartX + fourthIndex * (RICH_CARD_W + THIRD_CHILD_GAP), y: fourthY };
          });
          thirdSlotX += thirdSlot.width + THIRD_BRANCH_GAP;
        });
        secondSlotX += secondSlot.width + THIRD_BRANCH_GAP;
      });
      cursorX += clusterWidth + CLUSTER_GAP;
    });
    return map;
  }, [parentNodes, allSecondNodes, thirdNodes, fourthNodes]);
  const fourthRoundSummary = useMemo(() => (
    <div className="flex max-w-[760px] flex-wrap items-center gap-2 rounded-2xl border border-white/75 bg-white/84 px-3 py-2 text-[10px] font-bold leading-none text-[#53638d] shadow-[0_10px_28px_rgba(74,100,160,0.12)] backdrop-blur-xl">
      <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 font-black text-[#4f63a9]">新一轮群体反馈</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">第三轮已选 {selectedThirdNodes.length} 组</span>
      <span className="rounded-full bg-white/70 px-2 py-1 shadow-[inset_0_0_0_1px_rgba(223,230,255,0.85)]">每组生成 2 个方案</span>
      <span className="text-[10px] font-semibold leading-none text-[#66759f]">继承第三轮视图结构，并继续展开下一组候选方案</span>
    </div>
  ), [selectedThirdNodes.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const handleToggleFourthPlan = (node: EvolutionNode) => {
    if (finalSelectionMode) {
      setFinalSelectedIds((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
      return;
    }
    if (!selectableFourthNodeIds.includes(node.id)) return;
    setSelectedFourthPlanIds((current) => (current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id]));
  };

  const confirmFinalSelection = () => {
    if (finalSelectedIds.length === 0) return;
    saveFinalSelection(treeNodes, finalSelectedIds, 5);
    onOpenFinalConfirmation();
  };

  const handleSelectStage = (stage: StageKey) => {
    if (stage > maxVisitedStage) return;
    if (stage === 0) { onOpenStart(); return; }
    if (stage === 1) { onOpenAnalysis(); return; }
    if (stage === 2) { onOpenWorkspace(); return; }
    if (stage === 3) { onOpenGroupFeedback(); return; }
    if (stage === 4) { onBack(); return; }
    if (stage === 5) return;
    onOpenWorkspace();
  };

  return (
    <div className="glass-page-bg h-screen overflow-hidden">
      <button type="button" onClick={onBackHome} className="app-nav-home">
        <ArrowLeft size={16} /> 返回首页
      </button>
      <TopStageBar status={{ ...GROUP_FEEDBACK_STATUS, currentStage: 5, stageLabel: "第四轮" }} />
      <div className="grid h-[calc(100vh-56px)] min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
        <WorkflowStepper currentStage={5} maxVisitedStage={Math.max(maxVisitedStage, 5) as StageKey} onBack={onBack} onSelectStage={handleSelectStage} onOpenFinalConfirmation={onOpenFinalConfirmation} titleOverrides={{ 3: "第二轮", 4: "第三轮", 5: "第四轮" }} />
        <div className="min-h-0 min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="flex h-full flex-col items-center justify-center gap-5 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 size={40} className="animate-spin text-[var(--color-brand-primary)]" />
                <div className="text-lg font-black text-slate-800">正在汇总新一轮群体反馈结果…</div>
              </motion.div>
            ) : (
              <motion.div key="result" className="h-full min-h-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <main className="relative h-full min-h-0 overflow-hidden bg-transparent">
                  <EvolutionCanvas
                    key={`fourth-round-layout-v1-${selectedThirdNodes.map((node) => node.id).join("-")}-${displayFourthNodes.length}`}
                    nodes={treeNodes}
                    edges={treeEdges}
                    signals={fourthSignals}
                    initialPositions={initialPositions}
                    roundSummaries={{ 3: fourthRoundSummary }}
                    groupTotals={{ villagers: roundResult.villagers, merchants: roundResult.merchants, tourists: roundResult.tourists }}
                    autoFit
                    readOnly
                    selectionMode={panelOpen || finalSelectionMode}
                    selectableNodeIds={finalSelectionMode ? finalSelectableNodeIds : selectableFourthNodeIds}
                    mutedNodeIds={mutedPreviousNodeIds}
                    onToggleSelect={handleToggleFourthPlan}
                    onModify={() => undefined}
                    onRegenerate={() => undefined}
                    title="新一轮意见收集"
                    subtitle="第三轮已选方案继续生成"
                    description="已继承第三轮页面的树状视图与右侧共创交互，并基于第三轮中被选中的方案继续生成两个候选方案。"
                    roundLabels={{ 0: "第二轮 · 已确认父代", 1: "第三轮", 2: "第四轮", 3: "第五轮" }}
                  />
                  <RoundManagementPanel
                    initialConfig={roundConfig}
                    running={nextRoundRunning}
                    selectedPlans={selectedPlans}
                    targetStageLabel="下一轮"
                    selectionHint="请在画布中勾选要继续发起共创的新一轮方案（可多选）。"
                    confirmedMessage="将选中的新一轮方案继续发送给多主体，作为下一轮共创的父代方案。"
                    onStartRound={() => setNextRoundRunning(true)}
                    onViewResults={() => undefined}
                    open={panelOpen}
                    onToggle={() => setPanelOpen((current) => !current)}
                    finalSelectionActive={finalSelectionMode}
                    finalSelectedCount={finalSelectedIds.length}
                    onToggleFinalSelection={() => setFinalSelectionMode(true)}
                    onConfirmFinalSelection={confirmFinalSelection}
                  />
                </main>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
