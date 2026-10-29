import { nextIpImage } from "./ipGallery";
import type { DesignDimension, DesignTag, DesignVariant } from "../types/evolution";

const tag = (id: string, label: string, dimension: DesignDimension, weight = 50): DesignTag => ({
  id,
  label,
  dimension,
  weight,
});

export const baseEvolutionTags: DesignTag[] = [
  tag("apron", "围裙", "accessory", 58),
  tag("expression", "表情", "expression", 64),
  tag("bow", "领结", "accessory", 54),
  tag("gesture", "动作", "action", 60),
  tag("background", "背景", "background", 42),
  tag("round", "圆润", "shape", 68),
  tag("glossy", "油亮", "material", 46),
  tag("lively", "活泼", "style", 62),
  tag("ancient", "古蜀感", "style", 40),
  tag("warm", "暖色", "color", 70),
];

const svgVariant = nextIpImage;

export const evolutionVariants: DesignVariant[] = [
  {
    id: "ev-01",
    title: "暖色围裙方案",
    imageUrl: svgVariant("海窝子", "#f8fbff", "#e04f42", "M230 430 Q174 384 216 330 M490 430 Q542 380 504 324"),
    tags: [baseEvolutionTags[0], baseEvolutionTags[1], baseEvolutionTags[2], baseEvolutionTags[5], baseEvolutionTags[9]],
    description: "围裙、领结和暖色构成高识别的本地鹅 IP。",
  },
  {
    id: "ev-02",
    title: "活泼动作方案",
    imageUrl: svgVariant("明月村", "#fff8f0", "#4f8cff", "M232 406 Q174 330 244 306 M488 406 Q560 328 494 300"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[3], baseEvolutionTags[5], baseEvolutionTags[7], baseEvolutionTags[9]],
    description: "动作更外放，适合移动端投票快速判断。",
  },
  {
    id: "ev-03",
    title: "弱化配饰方案",
    imageUrl: svgVariant("古镇鹅", "#f9fff8", "#48a868", "M236 428 Q192 392 220 350 M484 428 Q524 392 500 350"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[5], baseEvolutionTags[7], baseEvolutionTags[8]],
    description: "减少围裙配饰，保留圆润和亲切表情。",
  },
  {
    id: "ev-04",
    title: "古蜀纹样方案",
    imageUrl: svgVariant("纹样鹅", "#f7f2ff", "#8b5cf6", "M236 412 Q184 360 226 320 M484 412 Q536 360 494 320"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[4], baseEvolutionTags[5], baseEvolutionTags[8]],
    description: "更强调文化感和背景关系。",
  },
  {
    id: "ev-05",
    title: "油亮美食色方案",
    imageUrl: svgVariant("烫油鹅", "#fff6ea", "#d97706", "M232 432 Q180 398 220 346 M488 432 Q542 396 500 342"),
    tags: [baseEvolutionTags[0], baseEvolutionTags[5], baseEvolutionTags[6], baseEvolutionTags[9]],
    description: "把地方美食的油润和暖色转译到角色材质。",
  },
  {
    id: "ev-06",
    title: "表情亲和方案",
    imageUrl: svgVariant("亲切鹅", "#f5fbff", "#2563eb", "M238 422 Q196 382 224 338 M482 422 Q520 382 496 338"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[5], baseEvolutionTags[7]],
    description: "强调微笑和亲切气质。",
  },
  {
    id: "ev-07",
    title: "轻背景方案",
    imageUrl: svgVariant("清爽鹅", "#f8fafc", "#14b8a6", "M236 412 Q190 374 226 336 M484 412 Q530 374 494 336"),
    tags: [baseEvolutionTags[3], baseEvolutionTags[4], baseEvolutionTags[5]],
    description: "降低背景存在感，保留角色主体。",
  },
  {
    id: "ev-08",
    title: "强领结方案",
    imageUrl: svgVariant("庆贺鹅", "#fff7fb", "#ec4899", "M230 420 Q172 360 234 320 M490 420 Q548 360 486 320"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[2], baseEvolutionTags[7], baseEvolutionTags[9]],
    description: "领结、暖色和活泼感增强。",
  },
  {
    id: "ev-09",
    title: "简洁剪影方案",
    imageUrl: svgVariant("剪影鹅", "#f6f7ff", "#6366f1", "M240 426 Q198 392 228 350 M480 426 Q522 392 492 350"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[5], baseEvolutionTags[8]],
    description: "更适合导视和小尺寸图标。",
  },
  {
    id: "ev-10",
    title: "热闹传播方案",
    imageUrl: svgVariant("传播鹅", "#fff9ed", "#f97316", "M224 412 Q164 336 240 304 M496 412 Q558 336 480 304"),
    tags: [baseEvolutionTags[2], baseEvolutionTags[3], baseEvolutionTags[7], baseEvolutionTags[9]],
    description: "强化社交传播感和肢体动作。",
  },
  {
    id: "ev-11",
    title: "克制文化方案",
    imageUrl: svgVariant("海窝子", "#f8fff7", "#22c55e", "M236 424 Q188 386 222 344 M484 424 Q532 386 498 344"),
    tags: [baseEvolutionTags[4], baseEvolutionTags[5], baseEvolutionTags[8]],
    description: "文化符号更克制，适合后续延展。",
  },
  {
    id: "ev-12",
    title: "最终融合方案",
    imageUrl: svgVariant("共创鹅", "#f7fbff", "#3b82f6", "M226 412 Q166 350 236 314 M494 412 Q554 350 484 314"),
    tags: [baseEvolutionTags[1], baseEvolutionTags[3], baseEvolutionTags[5], baseEvolutionTags[7], baseEvolutionTags[9]],
    description: "融合当前偏好的圆润、亲切、活泼与暖色。",
  },
];

export const initialEvolutionWeights = Object.fromEntries(
  baseEvolutionTags.map((item) => [item.id, item.weight]),
);
