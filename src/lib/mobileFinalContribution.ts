import type { EvolutionAction } from "../types/evolution";

export const MOBILE_FINAL_CONTRIBUTION_KEY = "collaborative-platform.mobile-final-contribution";

export type MobileFinalContribution = {
  preferredTags: Array<{ label: string; weight: number }>;
  actionCounts: Record<EvolutionAction, number>;
  totalRounds: number;
  finalDesignTitle?: string;
};

export function saveMobileFinalContribution(contribution: MobileFinalContribution): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MOBILE_FINAL_CONTRIBUTION_KEY, JSON.stringify(contribution));
  } catch {
    // ignore
  }
}

export function readMobileFinalContribution(): MobileFinalContribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MOBILE_FINAL_CONTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as MobileFinalContribution) : null;
  } catch {
    return null;
  }
}
