export type IndicatorDirection = 'positive' | 'negative' | 'interval';

export interface IndicatorRule {
  label: string;
  description?: string;
  range?: [number | null, number | null];
  comparator?: '<' | '<=' | '>' | '>=' | '==' | '!=';
  value?: number | string;
  score: number;
}

export interface IndicatorNode {
  id: string;
  name: string;
  definition: string;
  unit?: string;
  direction: IndicatorDirection;
  thresholdDescription?: string;
  rules: IndicatorRule[];
  children?: IndicatorNode[];
}

export interface IndicatorSystemConfig {
  id: string;
  name: string;
  applicableSystems: string[];
  minPrimarySelection: number;
  tree: IndicatorNode[];
}

export interface WeightScheme {
  id: string;
  name: string;
  createdAt: string;
  method: 'AHP' | 'Entropy' | 'Manual';
  indicatorWeights: Record<string, number>;
  description?: string;
}

export interface EvaluationResultDetail {
  indicatorId: string;
  indicatorName: string;
  value: number;
  rawValue: number | string;
  normalized: number;
  weight: number;
  contribution: number;
  score: number;
  ruleMatched?: string;
}

export interface DeviceEvaluationResult {
  deviceId: string;
  deviceName: string;
  systemId: string;
  totalScore: number;
  level: 'A' | 'B' | 'C' | 'D';
  evaluatedAt: string;
  details: EvaluationResultDetail[];
}
