import { evaluationLevelRules } from '@/config/powerEvaluationConfig';
import type { DeviceRecord } from '@/types/device';
import type {
  EvaluationResultDetail,
  IndicatorNode,
  IndicatorRule,
  WeightScheme
} from '@/types/evaluation';

export interface IndicatorScoreResult {
  score: number;
  matchedRule?: IndicatorRule;
}

export const matchIndicatorScore = (
  indicator: IndicatorNode,
  rawValue: number | string
): IndicatorScoreResult => {
  const rules = indicator.rules ?? [];
  if (typeof rawValue === 'number') {
    for (const rule of rules) {
      if (!rule.range) continue;
      const [min, max] = rule.range;
      const lowerOk = min === null || rawValue >= min;
      const upperOk = max === null || rawValue < max;
      if (lowerOk && upperOk) {
        return { score: rule.score, matchedRule: rule };
      }
    }
  } else {
    for (const rule of rules) {
      if (rule.value === rawValue) {
        return { score: rule.score, matchedRule: rule };
      }
    }
  }
  return { score: 60 };
};

export const normalizeValue = (
  indicator: IndicatorNode,
  rawValue: number,
  dataset: number[]
) => {
  if (!dataset.length) return 0;
  const min = Math.min(...dataset);
  const max = Math.max(...dataset);
  if (indicator.direction === 'positive') {
    return max === min ? 1 : (rawValue - min) / (max - min);
  }
  if (indicator.direction === 'negative') {
    return max === min ? 1 : (max - rawValue) / (max - min);
  }
  const mid = (max + min) / 2;
  const range = max - min || 1;
  return 1 - Math.abs(rawValue - mid) / (range / 2);
};

export const computeDeviceScore = (
  device: DeviceRecord,
  indicators: IndicatorNode[],
  weights: Record<string, number>,
  datasets?: Record<string, number[]>
): { total: number; details: EvaluationResultDetail[] } => {
  const details: EvaluationResultDetail[] = [];
  let total = 0;
  indicators.forEach((indicator) => {
    const metric = device.metrics.find((item) => item.indicatorId === indicator.id);
    if (!metric) {
      return;
    }
    const rawValue = metric.value;
    const dataset = datasets?.[indicator.id] ?? [];

    const normalized =
      typeof rawValue === 'number'
        ? normalizeValue(indicator, rawValue, dataset.length ? dataset : [rawValue])
        : 1;
    const { score, matchedRule } = matchIndicatorScore(indicator, rawValue);
    const weight = weights[indicator.id] ?? 0;
    const contribution = score * weight;
    total += contribution;
    details.push({
      indicatorId: indicator.id,
      indicatorName: indicator.name,
      value: typeof rawValue === 'number' ? Number(rawValue) : NaN,
      rawValue,
      normalized: Number.isFinite(normalized) ? normalized : 0,
      weight,
      contribution,
      score,
      ruleMatched: matchedRule?.label
    });
  });
  return { total, details };
};

export const determineLevel = (score: number) => {
  for (const rule of evaluationLevelRules) {
    if (score >= rule.min && score < rule.max) {
      return rule.level as 'A' | 'B' | 'C' | 'D';
    }
  }
  return 'D';
};

export const ahpPowerIteration = (matrix: number[][], maxIterations = 100, tolerance = 1e-6) => {
  const n = matrix.length;
  let vector = Array(n).fill(1 / n);
  for (let iter = 0; iter < maxIterations; iter += 1) {
    const next = Array(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        next[i] += matrix[i][j] * vector[j];
      }
    }
    const sum = next.reduce((acc, cur) => acc + cur, 0);
    const normalized = next.map((val) => val / sum);
    const diff = normalized.reduce((acc, cur, idx) => acc + Math.abs(cur - vector[idx]), 0);
    vector = normalized;
    if (diff < tolerance) {
      break;
    }
  }
  const lambdaMax = vector.reduce((acc, _, idx) => {
    const rowSum = matrix[idx].reduce((sum, val, j) => sum + val * vector[j], 0);
    return acc + rowSum / vector[idx];
  }, 0);
  const ci = (lambdaMax / n - 1) / (n - 1);
  const riTable: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0.58,
    4: 0.9,
    5: 1.12,
    6: 1.24,
    7: 1.32,
    8: 1.41,
    9: 1.45
  };
  const ri = riTable[n] ?? 1.5;
  const cr = ri === 0 ? 0 : ci / ri;
  return { weights: vector, ci, cr, lambdaMax };
};

export const entropyWeights = (dataset: number[][]) => {
  const m = dataset.length;
  const n = dataset[0]?.length ?? 0;
  const normalized = dataset.map((row) => {
    const sum = row.reduce((acc, cur) => acc + cur, 0);
    return row.map((val) => (sum === 0 ? 0 : val / sum));
  });
  const k = 1 / Math.log(m || 1);
  const entropies = Array(n).fill(0).map((_, j) => {
    let entropy = 0;
    for (let i = 0; i < m; i += 1) {
      const pij = normalized[i][j];
      if (pij > 0) {
        entropy -= pij * Math.log(pij);
      }
    }
    return k * entropy;
  });
  const redundancies = entropies.map((e) => 1 - e);
  const sumRedundancy = redundancies.reduce((acc, cur) => acc + cur, 0);
  return redundancies.map((val) => (sumRedundancy === 0 ? 0 : val / sumRedundancy));
};

export const normalizeWeights = (weights: Record<string, number>) => {
  const sum = Object.values(weights).reduce((acc, cur) => acc + cur, 0);
  const normalized: Record<string, number> = {};
  Object.entries(weights).forEach(([key, value]) => {
    normalized[key] = sum === 0 ? 0 : Number((value / sum).toFixed(4));
  });
  return normalized;
};

export const applyWeightScheme = (scheme: WeightScheme, indicators: IndicatorNode[]) => {
  const normalized = normalizeWeights(scheme.indicatorWeights);
  const payload: Record<string, number> = {};
  indicators.forEach((indicator) => {
    payload[indicator.id] = normalized[indicator.id] ?? 0;
  });
  return payload;
};

export const buildRadarSeries = (details: EvaluationResultDetail[]) => {
  return {
    indicator: details.map((item) => ({ name: item.indicatorName, max: 100 })),
    value: details.map((item) => Number(item.score.toFixed(2)))
  };
};

export const buildBarSeries = (details: EvaluationResultDetail[]) => {
  return {
    categories: details.map((item) => item.indicatorName),
    values: details.map((item) => Number(item.contribution.toFixed(2)))
  };
};
