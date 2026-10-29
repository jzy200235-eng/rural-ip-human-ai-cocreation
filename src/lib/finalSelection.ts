import type { EvolutionNode, StageKey } from "../types";

export const FINAL_SELECTION_STORAGE_KEY = "collaborative-platform.final-selection.ip-gallery-v1";

export interface FinalSelectionPlan {
  id: string;
  title: string;
  directionName?: string;
  directionCode?: string;
  imageUrl: string;
  description: string;
  keywords?: string[];
  consensus?: number;
  generation: number;
  stage: string;
}

export interface FinalSelectionRecord {
  confirmedStage: StageKey;
  plans: FinalSelectionPlan[];
}

export function saveFinalSelection(nodes: EvolutionNode[], selectedIds: string[], confirmedStage: StageKey) {
  const selectedIdSet = new Set(selectedIds);
  const plans: FinalSelectionPlan[] = nodes
    .filter((node) => selectedIdSet.has(node.id))
    .map((node) => ({
      id: node.id,
      title: node.candidate.title,
      directionName: node.candidate.directionName,
      directionCode: node.candidate.directionCode,
      imageUrl: node.candidate.imageUrl,
      description: node.candidate.tagline ?? node.candidate.description,
      keywords: node.candidate.keywords,
      consensus: node.candidate.consensus,
      generation: node.generation,
      stage: node.stage,
    }));

  window.sessionStorage.setItem(FINAL_SELECTION_STORAGE_KEY, JSON.stringify({ confirmedStage, plans }));
}

export function readFinalSelectionRecord(): FinalSelectionRecord {
  try {
    const raw = window.sessionStorage.getItem(FINAL_SELECTION_STORAGE_KEY);
    if (!raw) return { confirmedStage: 3, plans: [] };
    const parsed = JSON.parse(raw) as FinalSelectionRecord | FinalSelectionPlan[];
    if (Array.isArray(parsed)) return { confirmedStage: 3, plans: parsed };
    return { confirmedStage: parsed.confirmedStage ?? 3, plans: parsed.plans ?? [] };
  } catch {
    return { confirmedStage: 3, plans: [] };
  }
}

export function readFinalSelection(): FinalSelectionPlan[] {
  return readFinalSelectionRecord().plans;
}

export function clearFinalSelection() {
  window.sessionStorage.removeItem(FINAL_SELECTION_STORAGE_KEY);
}
