export type StageKey = 0 | 1 | 2 | 3 | 4 | 5;

export interface ProjectInfo {
  name: string;
  object: string;
  region: string;
  style: string;
}

export interface MaterialItem {
  id: string;
  title: string;
  type: "image" | "text";
  url?: string;
  note: string;
}

export interface OpinionItem {
  id: string;
  role: "村民" | "商户" | "游客" | "创作者";
  content: string;
}

export interface CandidateImage {
  id: string;
  title: string;
  imageUrl: string;
  promptTrace: string[];
  description: string;
  /** 方向编号，例如 A / B / C / D */
  directionCode?: string;
  /** 方向名称，例如 阳光亲和型 */
  directionName?: string;
  /** 一句话简介（非常简短） */
  tagline?: string;
  /** 关键词标签，例如 阳光、卡通 */
  keywords?: string[];
  /** 共识百分比 0-100 */
  consensus?: number;
  /** 分歧百分比 0-100 */
  divergence?: number;
}

export interface EvolutionNode {
  id: string;
  candidate: CandidateImage;
  generation: number;
  stage: string;
  selected?: boolean;
  x?: number;
  y?: number;
  /**
   * 派生方案类型，严格区分两条生成路径与轮次归属：
   * - "variant"：workspace 中对所选方案「修改 → 确认生成」产出的**同轮局部调整**，
   *   generation 与父代一致，不推进轮次（仍属当前轮，如第一轮的局部调整）。
   * - "evolved"：接入手机端「交互式进化计算」并完成结果汇总后产出的**下一轮子代**，
   *   generation = 父代 + 1，是唯一会推进轮次的路径（如汇总后形成第二轮）。
   * 未标记 kind 者为该轮的原始方案（初始方案 / 演化树阶段的形状节点）。
   */
  kind?: "variant" | "evolved";
  /** 派生节点的来源父节点 id，用于绘制父子连线与归属判定 */
  parentId?: string;
  /** 局部调整（variant）时录入的语义指令与滑块变量数值，用于替代「大众共识度」展示 */
  tuning?: { semantic: string; params: TuningParam[] };
}

export interface EvolutionEdge {
  id: string;
  source: string;
  target: string;
}

export interface RoundConfig {
  targetStage: string;
  selectedPlanIds: string[];
  participants: string[];
  weights: Record<string, number>;
  evalPerPerson: number;
  publishMethod: "link";
}

export interface TagFeedback {
  label: string;
  count: number;
}

export interface RoundResult {
  roundId: string;
  status: "idle" | "running" | "completed";
  totalParticipants: number;
  villagers: number;
  merchants: number;
  tourists: number;
  distribution: { candidate: string; votes: number }[];
  tagsByCandidate: Record<string, TagFeedback[]>;
}

export interface CrowdSignal {
  candidateId: string;
  totalVotes: number;
  villagerVotes: number;
  merchantVotes: number;
  touristVotes: number;
  tags: TagFeedback[];
}

export interface StageStatus {
  currentStage: StageKey;
  stageLabel: string;
  roundId?: string;
  roundStatus: "none" | "running" | "completed";
  participants: {
    villagers: number;
    business: number;
  };
}

export interface TuningParam {
  id: string;
  label: string;
  value: number;
  villagerAverage: number;
  touristAverage: number;
}
