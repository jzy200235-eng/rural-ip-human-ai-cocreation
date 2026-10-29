export const INTERACTIVE_EVOLUTION_SOURCE_KEY = "collaborative-platform.interactive-evolution-source.ip-gallery-v1";

export type InteractiveEvolutionSourcePlan = {
  id: string;
  index: number;
  title: string;
  imageUrl?: string;
  description?: string;
  keywords?: string[];
  consensus?: number;
};

export function saveInteractiveEvolutionSourcePlans(plans: InteractiveEvolutionSourcePlan[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(INTERACTIVE_EVOLUTION_SOURCE_KEY, JSON.stringify(plans));
  } catch {
    // ignore
  }
}

export function readInteractiveEvolutionSourcePlans(): InteractiveEvolutionSourcePlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(INTERACTIVE_EVOLUTION_SOURCE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
