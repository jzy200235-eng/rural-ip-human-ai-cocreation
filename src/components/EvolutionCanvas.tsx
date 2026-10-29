import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode, WheelEvent } from "react";
import type { CrowdSignal, EvolutionEdge, EvolutionNode, TuningParam } from "../types";
import { Button } from "./ui/button";
import { CandidateCard } from "./CandidateCard";
import { isDerivedNode, isEvolvedChild, isSelectableParent, usesRichCard } from "../lib/evolutionModel";
import { cn } from "../lib/utils";

interface Props {
  nodes: EvolutionNode[];
  edges: EvolutionEdge[];
  signals?: CrowdSignal[];
  finalMode?: boolean;
  selectionMode?: boolean;
  selectableNodeIds?: string[];
  mutedNodeIds?: string[];
  onModify: (node: EvolutionNode) => void;
  onRegenerate: (node: EvolutionNode) => void;
  onToggleSelect?: (node: EvolutionNode) => void;
  onGenerate?: (parent: EvolutionNode, tuning: { semantic: string; params: TuningParam[] }) => void;
  // 画布视图状态持久化（仅 /workspace 工作台传入）：初始视口/卡片位置 + 变更回传
  initialViewport?: CanvasViewport;
  initialPositions?: Record<string, CanvasPosition>;
  onViewStateChange?: (state: { viewport: CanvasViewport; elementPositions: Record<string, CanvasPosition> }) => void;
  // 顶部标题区文案覆盖：默认沿用工作台「方案汇总 · 第一轮」语境；
  // 群体共创结果页传入子代汇总语境，保证两页画布组件结构一致、仅文案随内容变化
  title?: string;
  subtitle?: string;
  description?: string;
  // 轮次标签覆盖：generation → 文案（如 { 0: "第一轮 · 初始方案", 1: "第二轮 · 群体进化" }）；
  // 不传则按 defaultRoundLabel 自动生成，保证每一行都能标注清楚属于第几轮
  roundLabels?: Record<number, string>;
  // 轮次标签旁的统计摘要区：群体结果页用于展示参与人数、方案总数与 Top 共识方案。
  roundSummaries?: Record<number, ReactNode>;
  // 群体总人数分母：用于子代卡片背面把各群体投票转译为评分占比。
  groupTotals?: { villagers: number; merchants: number; tourists: number };
  // 进入页面时自动适配视口：把所有方案卡片整体缩放并居中到画布可视区域（初始大小适当、整体居中）
  autoFit?: boolean;
  // 只读画布：锁定所有卡片，移除「修改 / 确认生成」入口（如群体共创结果页的已确认父代）
  readOnly?: boolean;
  // 只读结果页的重点高亮模式：selected=true 的节点高亮，其余节点降权置灰。
  selectionHighlightMode?: boolean;
}

const CARD_W = 148;
const CARD_H = 206;
const RICH_CARD_H = 416;        // 富卡片整体高度（含操作按钮），用于连线与画布高度计算
const STEP_X = 244;
const RICH_STEP_X = 324;        // 富卡片（w-288）横向步长
const VARIANT_DROP = 470;       // 同轮局部调整卡片相对父代下移量（仍在本轮区域内，不另起新一轮）
const START_X = 160;
const ROW_TOP = 150;            // 第一轮所在行的顶部
const ROW_GAP = 560;            // 轮次行距：容纳富卡片高度 + 父子连线
const MIN_ZOOM = 0;
const MAX_ZOOM = 2.4;
const SAFE_ZOOM = 0.01;
const DEFAULT_VIEWPORT = { x: 56, y: 42, scale: 1 };
const WHEEL_ZOOM_SENSITIVITY = 0.0042;
const ZOOM_IN_FACTOR = 1.3;
const ZOOM_OUT_FACTOR = 0.77;
// 第 generation 代（即第 generation+1 轮）所在行的 Y 坐标——轮次越深，行越往下，呈树状纵向生长
const rowY = (generation: number) => ROW_TOP + generation * ROW_GAP;
// 轮次标签：第一轮为初始方案生成，其后各轮均为手机端群体交互进化产出
const ROUND_ORDINALS = ["一", "二", "三", "四", "五", "六", "七", "八"];
const defaultRoundLabel = (generation: number) =>
  generation === 0
    ? `第${ROUND_ORDINALS[0]}轮 · 初始方案`
    : `第${ROUND_ORDINALS[generation] ?? String(generation + 1)}轮 · 群体进化`;
type CanvasPosition = { x: number; y: number };
type CanvasViewport = { x: number; y: number; scale: number };
type WebKitGestureEvent = Event & { scale?: number; clientX?: number; clientY?: number };

export function EvolutionCanvas({ nodes, edges, signals = [], finalMode, selectionMode = false, selectableNodeIds, mutedNodeIds, onModify, onRegenerate, onToggleSelect, onGenerate, initialViewport, initialPositions, onViewStateChange, title = "方案汇总", subtitle = "第一轮：初始方案生成", description = "已完成对大众意见归纳分析，并基于共识与分歧，归纳出 4 个可进入初代方案生成的方向。", roundLabels, roundSummaries, groupTotals, autoFit = false, readOnly = false, selectionHighlightMode = false }: Props) {
  const [viewport, setViewport] = useState<CanvasViewport>(initialViewport ?? DEFAULT_VIEWPORT);
  const [elementPositions, setElementPositions] = useState<Record<string, CanvasPosition>>(initialPositions ?? {});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportStateRef = useRef(initialViewport ?? DEFAULT_VIEWPORT);
  const gestureStartScaleRef = useRef((initialViewport ?? DEFAULT_VIEWPORT).scale);
  const panRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  // 视图状态变更后防抖回传给父组件持久化，避免拖拽/缩放过程中高频写入
  const onViewStateChangeRef = useRef(onViewStateChange);
  onViewStateChangeRef.current = onViewStateChange;
  useEffect(() => {
    if (!onViewStateChangeRef.current) return;
    const timer = window.setTimeout(() => {
      onViewStateChangeRef.current?.({ viewport, elementPositions });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [viewport, elementPositions]);

  // 基础栅格布局位置（仅用于原始方案 / 派生节点首帧兜底）
  const baseLayout = (node: EvolutionNode): CanvasPosition => {
    // 同一轮里只对「原始方案」做横向栅格排列，派生节点（局部调整 / 进化子代）另行依附父代定位
    const rowNodes = nodes.filter((item) => item.generation === node.generation && !isDerivedNode(item));
    const index = Math.max(0, rowNodes.findIndex((item) => item.id === node.id));
    const rich = !finalMode && usesRichCard(node);
    const stepX = rich ? RICH_STEP_X : STEP_X;
    const baseX = START_X + index * stepX;
    // 非 finalMode 下，节点按「轮次（generation）」分行——同一轮在同一水平行，下一轮整体下移一个 ROW_GAP
    const baseY = finalMode && node.generation === 0 ? 220 : rowY(node.generation);
    return { x: baseX, y: baseY };
  };

  // 解析派生节点位置：用户拖拽 > 依附父代定位 > 基础栅格。两条路径严格分开：
  // - 局部调整（variant）：紧贴父代下方展开，仍落在「本轮」区域，不另起新一轮；
  // - 进化子代（evolved）：纵向对齐到「下一轮」所在行，连线由上一轮贯通到本轮。
  const resolvePosition = (node: EvolutionNode, positions: Record<string, CanvasPosition>, seen = new Set<string>()): CanvasPosition => {
    if (positions[node.id]) return positions[node.id];
    if (isDerivedNode(node) && node.parentId && !seen.has(node.id)) {
      seen.add(node.id);
      const parent = nodes.find((item) => item.id === node.parentId);
      const parentPos = parent ? resolvePosition(parent, positions, seen) : { x: START_X, y: rowY(0) };
      const siblings = nodes.filter((item) => item.kind === node.kind && item.parentId === node.parentId);
      const sIndex = Math.max(0, siblings.findIndex((item) => item.id === node.id));
      const x = parentPos.x + sIndex * RICH_STEP_X;
      const y = isEvolvedChild(node) ? rowY(node.generation) : parentPos.y + VARIANT_DROP;
      return { x, y };
    }
    return baseLayout(node);
  };

  const withPositions = nodes.map((node) => {
    const position = resolvePosition(node, elementPositions);
    return {
      ...node,
      x: position.x,
      y: position.y,
    };
  });
  const byId = new Map(withPositions.map((node) => [node.id, node]));
  // 画布高度/宽度随实际卡片边界自适应增长：覆盖多父代 × 4 子代横向展开，避免最右侧子代或轮次线被裁切。
  const { maxNodeBottom, maxNodeRight } = withPositions.reduce(
    (acc, node) => {
      const rich = !finalMode && usesRichCard(node);
      const cardWidth = rich ? 288 : CARD_W;
      const cardHeight = rich ? RICH_CARD_H : CARD_H;
      return {
        maxNodeBottom: Math.max(acc.maxNodeBottom, (node.y ?? 0) + cardHeight),
        maxNodeRight: Math.max(acc.maxNodeRight, (node.x ?? 0) + cardWidth),
      };
    },
    { maxNodeBottom: 0, maxNodeRight: 0 },
  );
  const canvasHeight = finalMode ? 1120 : Math.max(860, maxNodeBottom + 90);
  // 画布上出现的所有「代」（= 轮次），用于在每一行渲染轮次标签带；finalMode 不分轮。
  // 关键：局部调整（variant）与父代同 generation，不会新增一行轮次标签——只有真正推进轮次的进化子代才会多出新一轮。
  const generations = finalMode ? [] : Array.from(new Set(nodes.map((node) => node.generation))).sort((a, b) => a - b);
  const canvasWidth = Math.max(1800, maxNodeRight + START_X);
  const generationMetrics = generations
    .map((generation) => {
      const rowNodes = withPositions.filter((node) => node.generation === generation);
      if (rowNodes.length === 0) return null;
      let minY = Infinity;
      let maxY = -Infinity;
      rowNodes.forEach((node) => {
        const rich = !finalMode && usesRichCard(node);
        const cardHeight = rich ? RICH_CARD_H : CARD_H;
        const y = node.y ?? 0;
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y + cardHeight);
      });
      return { generation, minY, maxY, labelY: minY - 66 };
    })
    .filter((metric): metric is { generation: number; minY: number; maxY: number; labelY: number } => metric !== null);
  const generationDividers = generationMetrics.slice(1).map((metric, index) => {
    const prev = generationMetrics[index];
    // 分割线放在子代行上方留白处，避开父代卡片底部、子代卡片顶部与轮次标签，避免视觉重叠。
    return { id: `${prev.generation}-${metric.generation}`, y: Math.max(prev.maxY + 54, metric.minY - 92) };
  });
  const activeNodeId = focusedNodeId ?? hoveredNodeId;
  const activeNode = activeNodeId ? byId.get(activeNodeId) : undefined;
  const isRelatedNode = (node: EvolutionNode) => {
    if (!activeNode) return true;
    if (node.id === activeNode.id) return true;
    if (activeNode.parentId) {
      return node.id === activeNode.parentId || node.parentId === activeNode.parentId;
    }
    return node.parentId === activeNode.id;
  };
  const isRelatedEdge = (edge: EvolutionEdge) => {
    if (!activeNode) return false;
    return edge.source === activeNode.id || edge.target === activeNode.id || (activeNode.parentId ? edge.source === activeNode.parentId : false);
  };

  // 派生节点出现后，将其位置「固化」一次到拖拽状态中，使其后续与父卡片完全解耦（互不联动）
  useEffect(() => {
    setElementPositions((current) => {
      let changed = false;
      const next = { ...current };
      nodes.forEach((node) => {
        if (isDerivedNode(node) && node.parentId && !next[node.id]) {
          next[node.id] = resolvePosition(node, next);
          changed = true;
        }
      });
      return changed ? next : current;
    });
    // resolvePosition / nodes 决定计算结果，nodes 变化即重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, finalMode]);

  // 进入页面时把所有卡片整体「缩放 + 居中」到画布可视区域：计算所有节点包围盒，
  // 求出能完整容纳内容的缩放比（不放大超过原始大小），再据此平移使内容在视口中居中。
  const fitToContent = () => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0 || withPositions.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    withPositions.forEach((node) => {
      const rich = !finalMode && usesRichCard(node);
      const w = rich ? 288 : CARD_W;
      const h = rich ? RICH_CARD_H : CARD_H;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    // 非 finalMode 顶部要为轮次标签带预留空间，避免「第一轮」标签被裁切
    if (!finalMode) minY -= 64;
    const contentW = Math.max(1, maxX - minX);
    const contentH = Math.max(1, maxY - minY);
    const padding = 72;
    const scale = clamp(
      Math.min((rect.width - padding * 2) / contentW, (rect.height - padding * 2) / contentH, 1),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    setViewport({
      scale,
      x: (rect.width - contentW * scale) / 2 - minX * scale,
      y: (rect.height - contentH * scale) / 2 - minY * scale,
    });
  };

  // 每次进入（组件挂载）时自动适配一次；用 rAF 等首帧布局完成后再测量容器尺寸
  useEffect(() => {
    if (!autoFit) return;
    const raf = window.requestAnimationFrame(() => fitToContent());
    return () => window.cancelAnimationFrame(raf);
    // 仅在挂载时执行一次自动适配，后续用户的平移/缩放不被覆盖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFit]);

  useEffect(() => {
    viewportStateRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const zoomByGesture = (nextScale: number, pointX: number, pointY: number) => {
      setViewport((current) => {
        const currentScale = Math.max(current.scale, SAFE_ZOOM);
        const worldX = (pointX - current.x) / currentScale;
        const worldY = (pointY - current.y) / currentScale;
        return {
          scale: nextScale,
          x: pointX - worldX * nextScale,
          y: pointY - worldY * nextScale,
        };
      });
    };

    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartScaleRef.current = viewportStateRef.current.scale;
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();
      const gestureEvent = event as WebKitGestureEvent;
      const rect = element.getBoundingClientRect();
      const pointX = typeof gestureEvent.clientX === "number" ? gestureEvent.clientX - rect.left : rect.width / 2;
      const pointY = typeof gestureEvent.clientY === "number" ? gestureEvent.clientY - rect.top : rect.height / 2;
      const nextScale = clamp(gestureStartScaleRef.current * (gestureEvent.scale ?? 1), MIN_ZOOM, MAX_ZOOM);
      zoomByGesture(nextScale, pointX, pointY);
    };

    element.addEventListener("gesturestart", handleGestureStart, { passive: false });
    element.addEventListener("gesturechange", handleGestureChange, { passive: false });
    return () => {
      element.removeEventListener("gesturestart", handleGestureStart);
      element.removeEventListener("gesturechange", handleGestureChange);
    };
  }, []);

  const zoomToPoint = (nextScale: number, pointX: number, pointY: number) => {
    setViewport((current) => {
      const currentScale = Math.max(current.scale, SAFE_ZOOM);
      const worldX = (pointX - current.x) / currentScale;
      const worldY = (pointY - current.y) / currentScale;
      return {
        scale: nextScale,
        x: pointX - worldX * nextScale,
        y: pointY - worldY * nextScale,
      };
    });
  };

  const zoomAtCenter = (factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const baseScale = viewport.scale <= 0 && factor > 1 ? SAFE_ZOOM : viewport.scale;
    zoomToPoint(clamp(baseScale * factor, MIN_ZOOM, MAX_ZOOM), rect.width / 2, rect.height / 2);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointX = event.clientX - rect.left;
    const pointY = event.clientY - rect.top;

    if (event.ctrlKey || event.metaKey) {
      setViewport((current) => {
        const currentScale = Math.max(current.scale, SAFE_ZOOM);
        const nextScale = clamp(currentScale * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY), MIN_ZOOM, MAX_ZOOM);
        const worldX = (pointX - current.x) / currentScale;
        const worldY = (pointY - current.y) / currentScale;
        return { scale: nextScale, x: pointX - worldX * nextScale, y: pointY - worldY * nextScale };
      });
      return;
    }

    setViewport((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [data-canvas-element]")) return;
    setFocusedNodeId(null);
    panRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    setViewport((current) => ({ ...current, x: pan.originX + event.clientX - pan.startX, y: pan.originY + event.clientY - pan.startY }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
  };

  const startElementDrag = (id: string, origin: CanvasPosition, event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;
    event.stopPropagation();
    dragRef.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleElementDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    setElementPositions((current) => ({
      ...current,
      [drag.id]: {
        x: drag.originX + (event.clientX - drag.startX) / Math.max(viewport.scale, SAFE_ZOOM),
        y: drag.originY + (event.clientY - drag.startY) / Math.max(viewport.scale, SAFE_ZOOM),
      },
    }));
  };

  const endElementDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <section className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-transparent">
      <div className="relative z-40 shrink-0 border-b border-white/45 bg-white/30 px-4 py-3 shadow-[0_10px_30px_rgba(74,100,160,0.06)] backdrop-blur-2xl sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-xl font-black leading-none text-[var(--color-text-strong)] sm:text-2xl">{title}</h2>
            <span className="glass-chip rounded-full px-3 py-1.5 text-xs font-bold leading-none text-[var(--color-text-muted)] sm:text-sm">{subtitle}</span>
          </div>
        </div>
        <p className="mt-2 text-xs font-bold leading-5 text-blue-600">{description}</p>
      </div>
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 cursor-grab overflow-hidden bg-white/20 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.30)_1px,transparent_0)] bg-[length:28px_28px] active:cursor-grabbing"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute left-0 top-0 min-h-full will-change-transform"
          style={{ width: canvasWidth, height: canvasHeight, transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`, transformOrigin: "0 0" }}
        >
          {/* 轮次标签：仅保留标签，不再附带横向导轨，避免与中间分割线重复 */}
          {generationMetrics.map((metric) => {
            const isFirstRound = metric.generation === 0;
            return (
              <div
                key={`round-band-${metric.generation}`}
                className="pointer-events-none absolute left-0 z-20 flex items-start gap-3 pl-7"
                style={{ top: metric.labelY }}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full border-2 px-5 py-2 text-sm font-black leading-none shadow-[0_10px_26px_rgba(74,100,160,0.16)] backdrop-blur-xl",
                    isFirstRound ? "bg-slate-100/95 text-slate-600" : "bg-white/95 text-[var(--color-brand-accent)] ring-4 ring-[color-mix(in_srgb,var(--color-brand-accent)_10%,transparent)]",
                  )}
                  style={{ borderColor: isFirstRound ? "color-mix(in srgb, var(--color-text-muted) 28%, transparent)" : "color-mix(in srgb, var(--color-brand-accent) 54%, transparent)" }}
                >
                  {roundLabels?.[metric.generation] ?? defaultRoundLabel(metric.generation)}
                </span>
                {roundSummaries?.[metric.generation] ? (
                  <div className="pointer-events-none">{roundSummaries[metric.generation]}</div>
                ) : null}
              </div>
            );
          })}
          {/* 父代/子代交界线：全页只保留这一条分割线，并放在两排卡片之间的留白处，避免与卡片重叠 */}
          {generationDividers.map((divider) => (
            <div
              key={`round-divider-${divider.id}`}
              className="pointer-events-none absolute left-0 z-0 flex items-center pl-7 pr-10"
              style={{ top: divider.y, width: canvasWidth }}
            >
              <span
                className="h-[3px] flex-1 rounded-full"
                style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--color-brand-accent) 58%, transparent), color-mix(in srgb, var(--color-brand-accent) 18%, transparent), transparent 72%)" }}
              />
            </div>
          ))}
          {finalMode ? (
            <DraggableCanvasElement id="texture-title" position={elementPositions["texture-title"] ?? { x: 96, y: 80 }} onStartDrag={startElementDrag} onDrag={handleElementDrag} onEndDrag={endElementDrag}>
              <div className="flex w-[680px] max-w-[680px] items-center gap-3 rounded-2xl bg-white px-4 py-3 text-2xl font-black text-slate-800 shadow">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">▧</span>
                <span className="shrink-0 leading-none">纹理</span>
                <span className="h-1 min-w-0 flex-1 rounded bg-gradient-to-r from-blue-500 to-purple-200" />
              </div>
            </DraggableCanvasElement>
          ) : null}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <marker id="evolution-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-brand-accent)" opacity="0.82" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const source = byId.get(edge.source);
              const target = byId.get(edge.target);
              if (!source || !target) return null;
              const sourceRich = !finalMode && usesRichCard(source);
              // 终点同样判断是否富卡片：富卡片宽 288（中心 +144），普通小卡片宽 148（中心 +74），
              // 否则连线会偏向富卡片左侧而非正中（如群体共创页的子代富卡片、工作台的局部调整节点）
              const targetRich = !finalMode && usesRichCard(target);
              const x1 = (source.x ?? 0) + (sourceRich ? 144 : CARD_W / 2);
              const y1 = (source.y ?? 0) + (sourceRich ? RICH_CARD_H : CARD_H - 2);
              const x2 = (target.x ?? 0) + (targetRich ? 144 : CARD_W / 2);
              const y2 = target.y ?? 0;
              const related = isRelatedEdge(edge);
              const dimmed = Boolean(activeNode && !related);
              return (
                <path
                  key={edge.id}
                  d={`M ${x1} ${y1} C ${x1} ${y1 + 92}, ${x2} ${y2 - 108}, ${x2} ${y2}`}
                  stroke={related ? "var(--color-brand-accent)" : "color-mix(in srgb, var(--color-brand-accent) 42%, transparent)"}
                  strokeWidth={related ? 5 : 2.5}
                  strokeDasharray={related ? "0" : "8 7"}
                  strokeLinecap="round"
                  markerEnd="url(#evolution-arrow)"
                  opacity={dimmed ? 0.14 : related ? 0.95 : 0.52}
                  fill="none"
                  style={{ transition: "opacity 180ms ease, stroke-width 180ms ease" }}
                />
              );
            })}
          </svg>
          {withPositions.map((node) => {
            const related = isRelatedNode(node);
            const focused = focusedNodeId === node.id;
            const selectable = selectionMode && !finalMode && isSelectableParent(node) && (!selectableNodeIds || selectableNodeIds.includes(node.id));
            const muted = mutedNodeIds?.includes(node.id);
            return (
              <DraggableCanvasElement key={node.id} id={node.id} position={{ x: node.x ?? 0, y: node.y ?? 0 }} onStartDrag={startElementDrag} onDrag={handleElementDrag} onEndDrag={endElementDrag}>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "outline-none transition-[opacity,filter] duration-200 ease-out focus-visible:[&_.glass-card]:ring-4 focus-visible:[&_.glass-card]:ring-[color-mix(in_srgb,var(--color-brand-accent)_22%,transparent)]",
                    muted && "relative opacity-[0.85] saturate-[0.76] brightness-[1.02] before:pointer-events-none before:absolute before:inset-0 before:z-30 before:rounded-[24px] before:bg-[linear-gradient(135deg,rgba(238,242,255,0.40),rgba(196,181,253,0.34)_48%,rgba(147,197,253,0.27))] before:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] before:backdrop-blur-[1px] before:content-[''] [&_.glass-card]:shadow-[0_12px_32px_rgba(74,100,160,0.09)]",
                    selectionHighlightMode && !node.selected && "opacity-[0.72] saturate-[0.9] brightness-[1.02]",
                    selectionHighlightMode && node.selected && "[&_.glass-card]:ring-4 [&_.glass-card]:ring-[color-mix(in_srgb,var(--color-brand-accent)_26%,transparent)] [&_.glass-card]:shadow-[0_30px_72px_rgba(74,100,160,0.24)]",
                    activeNode && !related && "opacity-45 saturate-75",
                    focused && "[&_.glass-card]:ring-4 [&_.glass-card]:ring-[color-mix(in_srgb,var(--color-brand-accent)_22%,transparent)] [&_.glass-card]:shadow-[0_28px_64px_rgba(74,100,160,0.22)]",
                  )}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("button")) return;
                    setFocusedNodeId((current) => (current === node.id ? null : node.id));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setFocusedNodeId((current) => (current === node.id ? null : node.id));
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
                >
                  <CandidateCard
                    node={node}
                    compact={finalMode}
                    signal={signals.find((signal) => signal.candidateId === node.id)}
                    selected={finalMode ? node.id === "n5" : selectionMode ? selectable && node.selected : selectionHighlightMode ? node.selected : false}
                    selectable={selectable}
                    locked={readOnly}
                    groupTotals={groupTotals}
                    onToggleSelect={onToggleSelect}
                    onModify={onModify}
                    onRegenerate={onRegenerate}
                    onGenerate={onGenerate}
                  />
                </div>
              </DraggableCanvasElement>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-5 right-5 z-30 flex items-center gap-1 rounded-xl bg-white/90 p-1 shadow-[0_16px_36px_rgba(33,62,122,0.14)] ring-1 ring-blue-50 backdrop-blur-xl">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-100 shadow-none" onClick={() => zoomAtCenter(ZOOM_OUT_FACTOR)} aria-label="缩小画布"><Minus size={16} /></Button>
        <span className="min-w-12 text-center text-xs font-black leading-none text-slate-500">{Math.round(viewport.scale * 100)}%</span>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-100 shadow-none" onClick={() => zoomAtCenter(ZOOM_IN_FACTOR)} aria-label="放大画布"><Plus size={16} /></Button>
      </div>
    </section>
  );
}

function DraggableCanvasElement({
  id,
  position,
  children,
  onStartDrag,
  onDrag,
  onEndDrag,
}: {
  id: string;
  position: CanvasPosition;
  children: ReactNode;
  onStartDrag: (id: string, origin: CanvasPosition, event: PointerEvent<HTMLDivElement>) => void;
  onDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onEndDrag: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      data-canvas-element
      className="absolute cursor-move touch-none select-none active:cursor-grabbing"
      style={{ left: position.x, top: position.y }}
      onPointerDown={(event) => onStartDrag(id, position, event)}
      onPointerMove={onDrag}
      onPointerUp={onEndDrag}
      onPointerCancel={onEndDrag}
    >
      {children}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
