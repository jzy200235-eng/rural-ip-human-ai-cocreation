import { nextIpImage } from "./ipGallery";
import type {
  CandidateImage,
  CrowdSignal,
  EvolutionEdge,
  EvolutionNode,
  MaterialItem,
  OpinionItem,
  ProjectInfo,
  RoundConfig,
  RoundResult,
  TuningParam,
} from "../types";

const svgData = nextIpImage;

export const projectInfo: ProjectInfo = {
  name: "海窝子鹅角色共创",
  object: "乡村文化角色 IP",
  region: "四川彭州 · 海窝子古镇",
  style: "亲切、喜庆、可爱、带老手艺记忆点",
};

export const materials: MaterialItem[] = [
  { id: "m1", title: "古镇酱鹅摊位", type: "image", url: svgData("海窝子", "#f7fbff", "#4788ff", "🍗"), note: "本地美食符号和围裙元素" },
  { id: "m2", title: "竹编斗笠", type: "image", url: svgData("明月村", "#fffaf1", "#65c36d", "🥣"), note: "乡村劳动与老手艺" },
  { id: "m3", title: "游客留言", type: "text", note: "希望角色更活泼一点，但不要太卡通。" },
];

export const opinions: OpinionItem[] = [
  { id: "o1", role: "村民", content: "要能看出本地酱鹅，不要只像普通卡通鸭。" },
  { id: "o2", role: "商户", content: "围裙和招牌可以更明显，适合做门头贴纸。" },
  { id: "o3", role: "游客", content: "表情更亲切，颜色可以热闹一点。" },
];

export const initialCandidates: CandidateImage[] = [
  { id: "c1", title: "图案-A", imageUrl: svgData("海窝子酱鹅", "#f8fbff", "#4b7cff", "🍳"), promptTrace: ["素材识别：酱鹅、围裙、厨师帽", "村民偏好：本地符号清晰", "生成：厨师鹅角色"], description: "厨师帽与酱鹅托盘作为主识别点。", directionCode: "A", directionName: "阳光亲和型", tagline: "以温暖待客的厨师形象与本地酱鹅记忆点为核心。", keywords: ["阳光", "亲和", "厨师"], consensus: 82, divergence: 18 },
  { id: "c2", title: "图案-B", imageUrl: svgData("试吃摊", "#fffdf8", "#8b5cf6", "🍽️"), promptTrace: ["素材识别：餐盘、试吃", "游客偏好：亲切轻松"], description: "适合宣传贴纸的试吃摊动作。", directionCode: "B", directionName: "慵懒可爱型", tagline: "以亲切、慢生活和古镇生活感为核心。", keywords: ["慵懒", "可爱", "慢生活"], consensus: 67, divergence: 33 },
  { id: "c3", title: "图案-C", imageUrl: svgData("海窝子", "#fff8f4", "#ef4da0", "👍"), promptTrace: ["语义：活泼", "动作：点赞", "色彩：红领结"], description: "更活泼的点赞动作与红色围裙。", directionCode: "C", directionName: "卡通可爱型", tagline: "以活泼点赞、年轻化表情与热闹配色为核心。", keywords: ["卡通", "活泼", "点赞"], consensus: 74, divergence: 26 },
  { id: "c4", title: "图案-D", imageUrl: svgData("酱鹅锅", "#f8fff9", "#53c06d", "🍲"), promptTrace: ["素材识别：锅具", "生成：头顶酱鹅锅"], description: "强化食物记忆点，造型更夸张。", directionCode: "D", directionName: "古蜀文化谐音型", tagline: "以食物记忆点与地域谐音趣味为核心。", keywords: ["古蜀", "谐音", "趣味"], consensus: 58, divergence: 42 },
];

export const childCandidates: CandidateImage[] = [
  { id: "c5", title: "形状-A", imageUrl: svgData("明月村烫油鹅", "#fffaf2", "#8b5cf6", "🥣"), promptTrace: ["继承：图案-A", "加入：斗笠、汤碗", "反馈：寓意好"], description: "斗笠与汤碗构成更乡土的形状语言。" },
  { id: "c6", title: "形状-B", imageUrl: svgData("明月烫鹅", "#fffdf8", "#63c978", "🍗"), promptTrace: ["继承：图案-A", "动作：端盘", "反馈：有点土气"], description: "保留厨师身份，减少夸张装饰。" },
  { id: "c7", title: "形状-C", imageUrl: svgData("明月村", "#f7fbff", "#4788ff", "👍"), promptTrace: ["继承：图案-A", "动作：点赞", "道具：蒸笼"], description: "更适合社交传播的点赞造型。" },
  { id: "c8", title: "形状-D", imageUrl: svgData("明月村烫油鹅", "#fff8f5", "#ef4da0", "🍗"), promptTrace: ["继承：图案-A", "强调：食物", "色彩：暖红"], description: "高识别食物符号与更强对比色。" },
];

export const initialNodes: EvolutionNode[] = initialCandidates.map((candidate, index) => ({
  id: `n${index + 1}`,
  candidate,
  generation: 0,
  stage: "图案",
  selected: false,
}));

export const childNodes: EvolutionNode[] = childCandidates.map((candidate, index) => ({
  id: `n${index + 5}`,
  candidate,
  generation: 1,
  stage: "形状",
  selected: index === 0 || index === 3,
}));

export const childEdges: EvolutionEdge[] = childNodes.map((node) => ({
  id: `e-n1-${node.id}`,
  source: "n1",
  target: node.id,
}));

export const roundConfig: RoundConfig = {
  targetStage: "第一轮",
  selectedPlanIds: [],
  participants: ["村民", "商户", "手艺人", "游客"],
  weights: { 村民: 1.0, 商户: 1.2, 手艺人: 1.1, 游客: 1.0 },
  evalPerPerson: 10,
  publishMethod: "link",
};

export const roundResult: RoundResult = {
  roundId: "97758621",
  status: "completed",
  totalParticipants: 73,
  villagers: 45,
  merchants: 28,
  tourists: 10,
  distribution: [
    { candidate: "形状-A", votes: 56 },
    { candidate: "形状-B", votes: 35 },
    { candidate: "形状-C", votes: 35 },
    { candidate: "形状-D", votes: 27 },
    { candidate: "形状-E", votes: 37 },
  ],
  tagsByCandidate: {
    "形状-A": [{ label: "不够亲切", count: 15 }, { label: "有点土气", count: 7 }, { label: "老手艺不能丢", count: 5 }],
    "形状-B": [{ label: "太复杂了", count: 10 }, { label: "寓意好", count: 9 }, { label: "颜色太花哨了", count: 6 }],
    "形状-C": [{ label: "动作自然", count: 8 }, { label: "适合贴纸", count: 6 }],
    "形状-D": [{ label: "颜色太花哨了", count: 6 }, { label: "食物明显", count: 12 }],
  },
};

export const crowdSignals: CrowdSignal[] = childNodes.map((node, index) => ({
  candidateId: node.id,
  totalVotes: [56, 35, 35, 27][index] ?? 37,
  villagerVotes: [35, 21, 22, 18][index] ?? 20,
  merchantVotes: [21, 14, 13, 9][index] ?? 17,
  touristVotes: [8, 5, 6, 4][index] ?? 4,
  tags: roundResult.tagsByCandidate[node.candidate.title] ?? [{ label: "寓意好", count: 6 }],
}));

export const tuningPresets: Record<string, TuningParam[]> = {
  活泼: [
    { id: "sat", label: "饱和度", value: 75, villagerAverage: 68, touristAverage: 82 },
    { id: "warm", label: "暖度", value: 60, villagerAverage: 55, touristAverage: 65 },
  ],
  喜庆: [
    { id: "red", label: "红色占比", value: 72, villagerAverage: 70, touristAverage: 76 },
    { id: "decor", label: "装饰密度", value: 58, villagerAverage: 50, touristAverage: 66 },
  ],
  亲切: [
    { id: "round", label: "圆润度", value: 80, villagerAverage: 75, touristAverage: 78 },
    { id: "smile", label: "表情亲和", value: 86, villagerAverage: 82, touristAverage: 88 },
  ],
};
