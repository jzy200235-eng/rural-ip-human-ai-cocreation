import { evolutionVariants } from "../data/evolutionMockData";
import type { DesignVariant, EvolutionAction } from "../types/evolution";

type NextVariantInput = {
  currentDesignId: string;
  selectedTags: string[];
  action: EvolutionAction;
  currentWeights: Record<string, number>;
  currentRound: number;
  variants?: DesignVariant[];
};

type NextVariantResult = {
  nextDesign: DesignVariant;
  nextWeights: Record<string, number>;
  feedbackText: string;
};

export function getNextVariant({
  currentDesignId,
  selectedTags,
  action,
  currentWeights,
  currentRound,
  variants = evolutionVariants,
}: NextVariantInput): NextVariantResult {
  const delta = action === "like" ? 8 : action === "unsure" ? 2 : -10;
  const nextWeights = { ...currentWeights };
  const tagIds = selectedTags.length ? selectedTags : ["overall"];

  tagIds.forEach((id) => {
    if (id === "overall") return;
    nextWeights[id] = clamp((nextWeights[id] ?? 50) + delta);
  });

  const currentIndex = variants.findIndex((item) => item.id === currentDesignId);
  const seed = selectedTags.reduce((sum, id) => sum + id.charCodeAt(0), currentRound);
  const step = action === "like" ? 1 + (seed % 2) : action === "unsure" ? 1 : 2 + (seed % 3);
  const nextDesign = variants[(Math.max(0, currentIndex) + step) % variants.length];

  const labels = selectedTags
    .map((id) => variants.flatMap((variant) => variant.tags).find((tag) => tag.id === id)?.label)
    .filter(Boolean);

  const feedbackText =
    action === "like"
      ? labels.length
        ? `已强化：${labels.join("、")}`
        : "已强化当前方案整体特征"
      : action === "unsure"
        ? labels.length
          ? `已标记待观察：${labels.join("、")}`
          : "已保留当前方案并轻微探索"
        : labels.length
          ? `已减弱：${labels.join("、")}`
          : "已减弱当前方案整体特征";

  return { nextDesign, nextWeights, feedbackText };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

// Future API seam:
// POST /api/evolution/next
// body: { currentDesignId, selectedTags, action, currentWeights, currentRound, userIdentity }
