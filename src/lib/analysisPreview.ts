import type { ProjectInfo } from "../types";

export const ANALYSIS_PREVIEW_STORAGE_KEY = "collaborative-platform.analysis-preview";

export type AnalysisTextSource = {
  id: string;
  speaker: string;
  role: string;
  importance: "normal" | "high" | "low";
  relatedImages: string;
  content: string;
};

export type AnalysisImageSource = {
  id: string;
  name: string;
  type: string;
  description: string;
  culture: string;
  url?: string;
};

export type AnalysisDirectionStatusType = "consensus" | "conflict_branch" | "constraint";
export type AnalysisDirectionTargetOutput = "white_model" | "material_library" | "both";

export type AnalysisDirection = {
  id: string;
  name: string;
  shortDescription: string;
  tags: string[];
  statusType: AnalysisDirectionStatusType;
  targetOutput: AnalysisDirectionTargetOutput;
  designMeaning: string;
  consensusEvidence: string[];
  conflictHandling: string;
  sourceUsers: string[];
  nextUse: string;
};

export type AnalysisSummaryStats = {
  consensusCount: number;
  conflictCount: number;
  directionCount: number;
};

export type AnalysisConflictStrategy = {
  title: string;
  description: string;
};

export type AnalysisPayload = {
  project: ProjectInfo;
  textSources: AnalysisTextSource[];
  imageSources: AnalysisImageSource[];
  useCases: string[];
  generatedAt: string;
  directions?: AnalysisDirection[];
  summaryStats?: AnalysisSummaryStats;
  conflictStrategies?: AnalysisConflictStrategy[];
};

export function buildAnalysisPayload({
  project,
  textSources,
  imageSources,
  useCases,
}: {
  project: ProjectInfo;
  textSources: AnalysisTextSource[];
  imageSources: AnalysisImageSource[];
  useCases: string[];
}): AnalysisPayload {
  return {
    project,
    textSources: textSources.filter((item) => item.content.trim() || item.speaker.trim()),
    imageSources: imageSources.filter((item) => item.name.trim() || item.description.trim() || item.url),
    useCases,
    generatedAt: new Date().toISOString(),
  };
}
