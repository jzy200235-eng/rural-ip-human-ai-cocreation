import type { EvolutionEdge, EvolutionNode, StageKey } from "../types";
import { normalizeLegacyNode } from "./evolutionModel";

// workspace 共创轮次操作状态的持久化键
// 用于在跳转到其他页面再返回 /workspace 时，恢复「生成链接」等操作产生的状态与结果
export const WORKSPACE_STATE_STORAGE_KEY = "collaborative-platform.workspace-cocreation.ip-gallery-v1";
export const WORKSPACE_UI_VERSION = 3;
const INTERACTIVE_EVOLUTION_PATH = "/interactive-evolution-demo";

export type WorkspaceRoundState = "none" | "running" | "completed";

// 画布视图状态：缩放/平移视口 + 用户拖拽后的卡片位置，跨页面切换时一并恢复，避免画布布局被重置
export type CanvasViewport = { x: number; y: number; scale: number };
export type CanvasElementPositions = Record<string, { x: number; y: number }>;

// 右侧共创边栏的操作状态：已确认方案、参与主体、权重、评价数量、已生成链接等。
// 跨页面切换后需整体恢复，否则切回 /workspace 时「生成链接」流程会被打回到「请先确认所选方案」，需重新操作一次。
export type RoundPanelState = {
  confirmed: boolean;
  participants: string[];
  weights: Record<string, number>;
  evalMode: "10" | "20" | "custom";
  customEval: number;
  generatedLink: string | null;
};

// 每个工作台阶段的画布快照：节点 / 连线 / 轮次状态。
// 用于在阶段间来回切换时恢复该阶段「初次使用后的最终形态」，而非重置成模板。
export type StageCanvasSnapshot = {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  roundState: WorkspaceRoundState;
};

export type PersistedWorkspaceState = {
  uiVersion?: number;
  stage: StageKey;
  maxVisitedStage: StageKey;
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  roundState: WorkspaceRoundState;
  coCreationPanelOpen: boolean;
  // 画布缩放/平移视口（可选，旧缓存无此字段时回落默认值）
  viewport?: CanvasViewport;
  // 画布中各卡片被拖拽后的位置（可选）
  elementPositions?: CanvasElementPositions;
  // 右侧共创边栏的操作状态（可选，旧缓存无此字段时回落默认值）
  roundPanel?: RoundPanelState;
  // 各阶段画布快照（可选，旧缓存无此字段时按模板初始化）
  stageSnapshots?: Partial<Record<StageKey, StageCanvasSnapshot>>;
};

// 兼容旧缓存：历史版本把 workspace 局部调整误标为 kind:"refined" 且 generation+1，
// 加载时统一迁移为 "variant" 并归回父代所在轮，保证轮次归属判定准确。
function normalizeNodes(nodes: EvolutionNode[] | undefined): EvolutionNode[] {
  if (!nodes?.length) return nodes ?? [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.map((node) => normalizeLegacyNode(node, byId));
}

function getInteractiveEvolutionUrl() {
  if (typeof window === "undefined") return INTERACTIVE_EVOLUTION_PATH;
  return `${window.location.origin}${INTERACTIVE_EVOLUTION_PATH}`;
}

function normalizeGeneratedLink(link: string | null | undefined) {
  if (!link) return null;
  return link.includes("co.ardot.app") || link.includes(INTERACTIVE_EVOLUTION_PATH) ? getInteractiveEvolutionUrl() : link;
}

function normalizeRoundPanel(panel: RoundPanelState | undefined) {
  if (!panel) return panel;
  return { ...panel, generatedLink: normalizeGeneratedLink(panel.generatedLink) };
}

function normalizeState(state: PersistedWorkspaceState): PersistedWorkspaceState {
  const nodes = normalizeNodes(state.nodes);
  const roundPanel = normalizeRoundPanel(state.roundPanel);
  // UI 版本升级时，清理旧版画布快照和坐标缓存，避免路由返回 /workspace 后继续套用旧布局/旧阶段缓存，导致卡片看起来回退到旧视觉状态。
  if (state.uiVersion !== WORKSPACE_UI_VERSION) {
    return {
      ...state,
      uiVersion: WORKSPACE_UI_VERSION,
      nodes,
      roundPanel,
      viewport: undefined,
      elementPositions: undefined,
      stageSnapshots: undefined,
    };
  }
  const stageSnapshots = state.stageSnapshots
    ? Object.fromEntries(
        Object.entries(state.stageSnapshots).map(([stage, snapshot]) => [
          stage,
          snapshot ? { ...snapshot, nodes: normalizeNodes(snapshot.nodes) } : snapshot,
        ]),
      )
    : state.stageSnapshots;
  return { ...state, uiVersion: WORKSPACE_UI_VERSION, nodes, roundPanel, stageSnapshots };
}

export function loadWorkspaceState(): PersistedWorkspaceState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_STATE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as PersistedWorkspaceState);
  } catch {
    return null;
  }
}

export function saveWorkspaceState(state: PersistedWorkspaceState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify({ ...state, uiVersion: WORKSPACE_UI_VERSION }));
  } catch {
    // 忽略持久化失败（如隐私模式），不影响交互
  }
}

export function clearWorkspaceState(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(WORKSPACE_STATE_STORAGE_KEY);
  } catch {
    // ignore
  }
}
