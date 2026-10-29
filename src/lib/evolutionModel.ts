import type { EvolutionNode } from "../types";

/**
 * 方案演化的「轮次归属」判定中心。
 *
 * 两条生成路径必须严格区分，避免把局部调整误判为新一轮：
 * 1. 同轮局部调整（variant）：workspace 中对所选方案「修改 → 确认生成」，generation 不变，仍属当前轮。
 * 2. 跨轮进化子代（evolved）：接入手机端交互式进化计算并完成汇总后产出，generation + 1，唯一推进轮次的路径。
 *
 * 所有涉及「是否派生 / 是否富卡片 / 是否可被选为父代 / 属于第几轮」的判定都走这里，确保口径一致。
 */

type KindFields = Pick<EvolutionNode, "kind">;
type RoundFields = Pick<EvolutionNode, "kind" | "generation">;

/** 同轮局部调整（workspace 修改→生成） */
export const isLocalVariant = (node: KindFields): boolean => node.kind === "variant";

/** 跨轮进化子代（手机端交互进化汇总） */
export const isEvolvedChild = (node: KindFields): boolean => node.kind === "evolved";

/** 任意派生方案（局部调整 / 进化子代） */
export const isDerivedNode = (node: KindFields): boolean => isLocalVariant(node) || isEvolvedChild(node);

/** 是否使用「富卡片」渲染：第一轮原始方案 + 任意派生方案 */
export const usesRichCard = (node: RoundFields): boolean => node.generation === 0 || isDerivedNode(node);

/** 是否可被勾选为下一轮共创的父代：第一轮原始方案 + 任意派生方案 */
export const isSelectableParent = (node: RoundFields): boolean => node.generation === 0 || isDerivedNode(node);

/**
 * 兼容旧持久化数据：历史版本曾用 kind:"refined" 表示 workspace 的局部调整，
 * 统一迁移为 "variant" 并清除其被误加的 generation 偏移（归回父代所在轮）。
 */
export function normalizeLegacyNode<T extends EvolutionNode>(node: T, parentsById?: Map<string, EvolutionNode>): T {
  if ((node.kind as string) !== "refined") return node;
  const parent = node.parentId ? parentsById?.get(node.parentId) : undefined;
  return {
    ...node,
    kind: "variant",
    generation: parent ? parent.generation : Math.max(0, node.generation - 1),
  };
}
