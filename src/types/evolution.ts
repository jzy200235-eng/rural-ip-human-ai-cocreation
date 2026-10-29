export type EvolutionAction = "like" | "unsure" | "dislike";

export type DesignDimension =
  | "shape"
  | "color"
  | "style"
  | "material"
  | "accessory"
  | "expression"
  | "action"
  | "background";

export type DesignTag = {
  id: string;
  label: string;
  dimension: DesignDimension;
  weight: number;
};

export type DesignVariant = {
  id: string;
  imageUrl: string;
  title?: string;
  tags: DesignTag[];
  description?: string;
};

export type InteractionRecord = {
  round: number;
  designId: string;
  selectedTagIds: string[];
  action: EvolutionAction;
  beforeWeights: Record<string, number>;
  afterWeights: Record<string, number>;
  feedbackText: string;
  timestamp: number;
};

export type EvolutionState = {
  currentRound: number;
  maxRound: number;
  currentDesign: DesignVariant;
  selectedTagIds: string[];
  weights: Record<string, number>;
  records: InteractionRecord[];
  feedbackText?: string;
};
