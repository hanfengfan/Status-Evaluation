import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import {
  defaultWeightSchemes,
  evaluationHistoryKey,
  indicatorSystems
} from '@/config/powerEvaluationConfig';
import type {
  DeviceEvaluationResult,
  IndicatorNode,
  IndicatorSystemConfig,
  WeightScheme
} from '@/types/evaluation';

const WEIGHT_STORAGE_KEY = 'urban-rail-weight-schemes';
const SELECTION_STORAGE_KEY = 'urban-rail-selected-indicators';

const flattenIndicators = (nodes: IndicatorNode[]): Record<string, IndicatorNode> => {
  const result: Record<string, IndicatorNode> = {};
  const walk = (items: IndicatorNode[]) => {
    items.forEach((item) => {
      result[item.id] = item;
      if (item.children?.length) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return result;
};

const loadWeightSchemes = (): WeightScheme[] => {
  if (typeof window === 'undefined') {
    return [...defaultWeightSchemes];
  }
  try {
    const stored = window.localStorage.getItem(WEIGHT_STORAGE_KEY);
    if (!stored) {
      return [...defaultWeightSchemes];
    }
    const parsed = JSON.parse(stored) as WeightScheme[];
    return parsed.length ? parsed : [...defaultWeightSchemes];
  } catch (error) {
    console.warn('加载权重方案失败', error);
    return [...defaultWeightSchemes];
  }
};

const loadSelections = (): string[] => {
  if (typeof window === 'undefined') {
    return Object.keys(defaultWeightSchemes[0].indicatorWeights);
  }
  try {
    const stored = window.localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!stored) {
      return Object.keys(defaultWeightSchemes[0].indicatorWeights);
    }
    const parsed = JSON.parse(stored) as string[];
    return parsed.length ? parsed : Object.keys(defaultWeightSchemes[0].indicatorWeights);
  } catch (error) {
    console.warn('加载指标选择失败', error);
    return Object.keys(defaultWeightSchemes[0].indicatorWeights);
  }
};

const loadHistory = (): DeviceEvaluationResult[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(evaluationHistoryKey);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as DeviceEvaluationResult[];
  } catch (error) {
    console.warn('加载历史评估失败', error);
    return [];
  }
};

export const useEvaluationStore = defineStore('evaluation', () => {
  const systemOptions = ref<IndicatorSystemConfig[]>(indicatorSystems);
  const activeSystemId = ref<string>(systemOptions.value[0]?.id ?? '');

  const indicatorMap = computed(() => {
    const system = systemOptions.value.find((item) => item.id === activeSystemId.value);
    return system ? flattenIndicators(system.tree) : {};
  });

  const selectedIndicatorIds = ref<string[]>(loadSelections());
  const weightSchemes = ref<WeightScheme[]>(loadWeightSchemes());
  const activeSchemeId = ref<string>(weightSchemes.value[0]?.id ?? '');
  const history = ref<DeviceEvaluationResult[]>(loadHistory());

  const activeSystem = computed(() =>
    systemOptions.value.find((item) => item.id === activeSystemId.value) ?? null
  );

  const selectedIndicators = computed(() =>
    selectedIndicatorIds.value
      .map((id) => indicatorMap.value[id])
      .filter((item): item is IndicatorNode => Boolean(item))
  );

  const activeScheme = computed(() =>
    weightSchemes.value.find((item) => item.id === activeSchemeId.value) ?? null
  );

  const validateSelection = () => {
    const primaryIds = new Set(
      selectedIndicators.value.map((indicator) => indicator.id.split('.')[0])
    );
    const min = activeSystem.value?.minPrimarySelection ?? 1;
    return primaryIds.size >= min;
  };

  const toggleIndicator = (id: string, checked: boolean) => {
    if (checked) {
      if (!selectedIndicatorIds.value.includes(id)) {
        selectedIndicatorIds.value.push(id);
      }
    } else {
      selectedIndicatorIds.value = selectedIndicatorIds.value.filter((item) => item !== id);
    }
  };

  const setIndicators = (ids: string[]) => {
    selectedIndicatorIds.value = [...new Set(ids)];
  };

  const saveWeightScheme = (scheme: WeightScheme) => {
    const index = weightSchemes.value.findIndex((item) => item.id === scheme.id);
    if (index === -1) {
      weightSchemes.value.push(scheme);
    } else {
      weightSchemes.value[index] = scheme;
    }
    activeSchemeId.value = scheme.id;
  };

  const deleteWeightScheme = (id: string) => {
    weightSchemes.value = weightSchemes.value.filter((item) => item.id !== id);
    if (activeSchemeId.value === id) {
      activeSchemeId.value = weightSchemes.value[0]?.id ?? '';
    }
  };

  const setActiveScheme = (id: string) => {
    activeSchemeId.value = id;
  };

  const appendEvaluationHistory = (records: DeviceEvaluationResult[]) => {
    history.value = [...records, ...history.value].slice(0, 30);
  };

  const clearHistory = () => {
    history.value = [];
  };

  const exportSchemes = () => {
    return JSON.stringify(weightSchemes.value, null, 2);
  };

  const importSchemes = (payload: string) => {
    const parsed = JSON.parse(payload) as WeightScheme[];
    if (!Array.isArray(parsed)) {
      throw new Error('导入格式错误');
    }
    weightSchemes.value = parsed;
    activeSchemeId.value = parsed[0]?.id ?? '';
  };

  if (typeof window !== 'undefined') {
    const createPersistTask = <T>(key: string, getter: () => T) => {
      let timer: ReturnType<typeof window.setTimeout> | null = null;
      return () => {
        if (timer !== null) {
          window.clearTimeout(timer);
        }
        timer = window.setTimeout(() => {
          window.localStorage.setItem(key, JSON.stringify(getter()));
          timer = null;
        }, 120);
      };
    };

    const persistWeights = createPersistTask(WEIGHT_STORAGE_KEY, () => weightSchemes.value);
    const persistSelections = createPersistTask(SELECTION_STORAGE_KEY, () => selectedIndicatorIds.value);
    const persistHistory = createPersistTask(evaluationHistoryKey, () => history.value);

    watch(
      weightSchemes,
      () => {
        persistWeights();
      },
      { deep: true }
    );

    watch(
      selectedIndicatorIds,
      () => {
        persistSelections();
      },
      { deep: true }
    );

    watch(
      history,
      () => {
        persistHistory();
      },
      { deep: true }
    );
  }

  return {
    systemOptions,
    activeSystemId,
    activeSystem,
    indicatorMap,
    selectedIndicatorIds,
    selectedIndicators,
    weightSchemes,
    activeSchemeId,
    activeScheme,
    history,
    validateSelection,
    toggleIndicator,
    setIndicators,
    saveWeightScheme,
    deleteWeightScheme,
    setActiveScheme,
    appendEvaluationHistory,
    clearHistory,
    exportSchemes,
    importSchemes
  };
});
