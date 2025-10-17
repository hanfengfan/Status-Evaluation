<template>
  <div class="evaluation-page">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover" class="module-card">
          <template #header>
            <div class="card-header">
              <div>
                <h2>指标体系选择</h2>
                <p>依据配置选择需要参与评估的指标体系及具体指标</p>
              </div>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-card class="inner-card" shadow="never">
                <template #header>
                  <div class="inner-header">
                    <span>指标方案</span>
                    <el-tag type="info" effect="plain">
                      至少选择 {{ evaluationStore.activeSystem?.minPrimarySelection ?? 1 }} 个一级指标
                    </el-tag>
                  </div>
                </template>
                <el-tree
                  ref="treeRef"
                  :data="indicatorTreeData"
                  show-checkbox
                  node-key="id"
                  :default-expanded-keys="expandedKeys"
                  :default-checked-keys="evaluationStore.selectedIndicatorIds"
                  :props="treeProps"
                  @check="handleIndicatorCheck"
                />
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card class="inner-card" shadow="never">
                <template #header>
                  <div class="inner-header">
                    <span>指标定义</span>
                  </div>
                </template>
                <el-empty v-if="!activeIndicator" description="请选择指标查看详细定义" />
                <div v-else class="indicator-detail">
                  <h3>{{ activeIndicator.name }}</h3>
                  <p class="definition">{{ activeIndicator.definition }}</p>
                  <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="指标编号">{{ activeIndicator.id }}</el-descriptions-item>
                    <el-descriptions-item label="单位">{{ activeIndicator.unit ?? '—' }}</el-descriptions-item>
                    <el-descriptions-item label="方向">
                      {{ directionLabel(activeIndicator.direction) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="阈值/评分规则">
                      <el-space direction="vertical" alignment="stretch">
                        <el-tag v-for="rule in activeIndicator.rules" :key="rule.label" type="info">
                          {{ rule.label }} → {{ rule.score }} 分
                        </el-tag>
                      </el-space>
                    </el-descriptions-item>
                  </el-descriptions>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card class="inner-card" shadow="never">
                <template #header>
                  <div class="inner-header">
                    <span>已选指标</span>
                  </div>
                </template>
                <el-timeline>
                  <el-timeline-item
                    v-for="indicator in evaluationStore.selectedIndicators"
                    :key="indicator.id"
                    :timestamp="indicator.id"
                  >
                    {{ indicator.name }}
                  </el-timeline-item>
                </el-timeline>
                <div class="selection-actions">
                  <el-button size="small" type="primary" @click="selectAllIndicators">
                    全选叶子指标
                  </el-button>
                  <el-button size="small" @click="clearSelection">清空选择</el-button>
                  <el-alert
                    v-if="!selectionValid"
                    title="请选择足够的一级指标"
                    type="warning"
                    show-icon
                    :closable="false"
                    class="mt-12"
                  />
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover" class="module-card">
          <template #header>
            <div class="card-header">
              <div>
                <h2>指标权重计算</h2>
                <p>提供 AHP、熵权法以及手工录入三种方案，并可保存为权重方案</p>
              </div>
              <el-space>
                <el-select v-model="selectedSchemeId" placeholder="选择权重方案" style="width: 220px">
                  <el-option
                    v-for="scheme in evaluationStore.weightSchemes"
                    :key="scheme.id"
                    :label="scheme.name"
                    :value="scheme.id"
                  />
                </el-select>
                <el-button @click="schemeDialogVisible = true">查看方案</el-button>
                <el-upload
                  class="scheme-upload"
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="application/json"
                  :on-change="handleImportSchemes"
                >
                  <el-button>导入方案</el-button>
                </el-upload>
              </el-space>
            </div>
          </template>

          <el-tabs v-model="activeWeightTab">
            <el-tab-pane label="AHP 层次分析法" name="ahp">
              <div class="tab-wrapper">
                <el-alert
                  title="使用 1-9 标度对指标进行两两比较，系统自动完成特征向量与一致性检验"
                  type="info"
                  show-icon
                />
                <div class="matrix-table" v-if="indicatorList.length">
                  <table>
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th v-for="indicator in indicatorList" :key="indicator.id">{{ indicator.name }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in ahpMatrix" :key="indicatorList[rowIndex].id">
                        <th>{{ indicatorList[rowIndex].name }}</th>
                        <td v-for="(value, colIndex) in row" :key="colIndex">
                          <el-input-number
                            v-model="ahpMatrix[rowIndex][colIndex]"
                            :min="1"
                            :max="9"
                            :precision="2"
                            :disabled="rowIndex === colIndex"
                            @change="(val) => handleAhpInput(rowIndex, colIndex, Number(val))"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="empty-tip">
                  <el-empty description="请先选择指标" />
                </div>
                <div class="tab-actions">
                  <el-button type="primary" :disabled="!indicatorList.length" @click="computeAHP">
                    计算权重
                  </el-button>
                  <el-button
                    type="success"
                    :disabled="!ahpResult || ahpResult?.cr >= 0.1"
                    @click="saveAhpScheme"
                  >
                    保存为方案
                  </el-button>
                  <el-tag v-if="ahpResult" :type="ahpResult.cr < 0.1 ? 'success' : 'warning'">
                    CI={{ ahpResult.ci.toFixed(3) }} / CR={{ ahpResult.cr.toFixed(3) }}
                  </el-tag>
                </div>
                <el-table v-if="ahpResult" :data="ahpTable" border stripe size="small">
                  <el-table-column prop="name" label="指标" />
                  <el-table-column prop="weight" label="权重" />
                </el-table>
              </div>
            </el-tab-pane>
            <el-tab-pane label="熵权法" name="entropy">
              <div class="tab-wrapper">
                <el-alert
                  title="录入样本数据，熵权法根据信息熵自动计算客观权重"
                  type="info"
                  show-icon
                />
                <div v-if="indicatorList.length">
                  <el-table :data="entropySamples" border size="small">
                    <el-table-column prop="index" label="样本" width="80">
                      <template #default="{ $index }">样本 {{ $index + 1 }}</template>
                    </el-table-column>
                    <el-table-column
                      v-for="(indicator, index) in indicatorList"
                      :key="indicator.id"
                      :label="indicator.name"
                    >
                      <template #default="{ row }">
                        <el-input-number
                          v-model="row.values[index]"
                          :min="0"
                          :max="9999"
                          :step="0.1"
                        />
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="120">
                      <template #default="{ $index }">
                        <el-button type="text" @click="removeEntropySample($index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  <div class="tab-actions">
                    <el-button type="primary" @click="addEntropySample">新增样本</el-button>
                    <el-button type="primary" @click="computeEntropy">计算权重</el-button>
                    <el-button type="success" :disabled="!entropyResult" @click="saveEntropyScheme">
                      保存为方案
                    </el-button>
                  </div>
                  <el-table v-if="entropyResult" :data="entropyTable" border size="small">
                    <el-table-column prop="name" label="指标" />
                    <el-table-column prop="weight" label="权重" />
                  </el-table>
                </div>
                <div v-else class="empty-tip">
                  <el-empty description="请先选择指标" />
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="手工权重" name="manual">
              <div class="tab-wrapper">
                <el-alert
                  title="直接录入权重值，系统校验权重和应为 1"
                  type="info"
                  show-icon
                />
                <div v-if="indicatorList.length">
                  <el-table :data="manualTable" border size="small">
                    <el-table-column prop="name" label="指标" />
                    <el-table-column label="权重">
                      <template #default="{ row }">
                        <el-input-number
                          v-model="manualWeights[row.id]"
                          :min="0"
                          :max="1"
                          :step="0.01"
                        />
                      </template>
                    </el-table-column>
                  </el-table>
                  <div class="tab-actions">
                    <el-tag :type="Math.abs(manualWeightSum - 1) < 0.01 ? 'success' : 'warning'">
                      权重和：{{ manualWeightSum.toFixed(3) }}
                    </el-tag>
                    <el-button
                      type="success"
                      :disabled="Math.abs(manualWeightSum - 1) >= 0.01"
                      @click="saveManualScheme"
                    >
                      保存为方案
                    </el-button>
                  </div>
                </div>
                <div v-else class="empty-tip">
                  <el-empty description="请先选择指标" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover" class="module-card">
          <template #header>
            <div class="card-header">
              <div>
                <h2>设备状态评估与等级划分</h2>
                <p>选择设备清单与权重方案，执行综合评估并查看可视化结果</p>
              </div>
              <el-space>
                <el-select v-model="evaluationSystemId" placeholder="选择设备系统" style="width: 200px">
                  <el-option
                    v-for="system in deviceStore.systems"
                    :key="system.id"
                    :label="system.name"
                    :value="system.id"
                  />
                </el-select>
                <el-select v-model="selectedSchemeId" placeholder="选择权重方案" style="width: 220px">
                  <el-option
                    v-for="scheme in evaluationStore.weightSchemes"
                    :key="scheme.id"
                    :label="scheme.name"
                    :value="scheme.id"
                  />
                </el-select>
                <el-button type="primary" :disabled="!canEvaluate" @click="handleEvaluate">
                  执行评估
                </el-button>
                <el-button :disabled="!evaluationResults.length" @click="exportEvaluation">导出结果</el-button>
              </el-space>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-card class="inner-card" shadow="never">
                <template #header>
                  <div class="inner-header">
                    <span>设备列表</span>
                  </div>
                </template>
                <el-checkbox-group v-model="selectedDeviceIds" class="device-checkbox-list">
                  <el-checkbox
                    v-for="device in availableDevices"
                    :key="device.id"
                    :label="device.id"
                  >
                    {{ device.name }}（{{ device.status }}）
                  </el-checkbox>
                </el-checkbox-group>
                <el-alert
                  v-if="!selectedDeviceIds.length"
                  title="请选择至少一台设备"
                  type="warning"
                  show-icon
                  :closable="false"
                  class="mt-12"
                />
              </el-card>
            </el-col>
            <el-col :span="16">
              <div class="results-area">
                <el-tabs v-if="evaluationResults.length" v-model="activeResultId">
                  <el-tab-pane
                    v-for="result in evaluationResults"
                    :key="result.deviceId"
                    :label="`${result.deviceName}（${result.level}）`"
                    :name="result.deviceId"
                  >
                    <el-row :gutter="20" class="result-grid">
                      <el-col :xs="24" :md="10">
                        <el-card shadow="never" class="result-card score-card">
                          <div class="score-block">
                            <h3>综合得分</h3>
                            <span class="score">{{ result.totalScore.toFixed(1) }}</span>
                            <el-tag :type="gradeTagType(result.level)" effect="dark">
                              等级 {{ result.level }}
                            </el-tag>
                          </div>
                          <ul class="detail-list">
                            <li v-for="detail in result.details" :key="detail.indicatorId">
                              <span>{{ detail.indicatorName }}</span>
                              <span>{{ formatRawValue(detail.rawValue) }} → {{ detail.score.toFixed(1) }}分</span>
                            </li>
                          </ul>
                        </el-card>
                      </el-col>
                      <el-col :xs="24" :md="7">
                        <el-card shadow="never" class="result-card chart-card">
                          <RadarChart
                            v-if="detailsMap[result.deviceId]"
                            :title="'短板指标雷达图'"
                            :indicator="detailsMap[result.deviceId].radar.indicator"
                            :value="detailsMap[result.deviceId].radar.value"
                          />
                          <el-empty v-else description="暂无数据" />
                        </el-card>
                      </el-col>
                      <el-col :xs="24" :md="7">
                        <el-card shadow="never" class="result-card chart-card">
                          <BarChart
                            v-if="detailsMap[result.deviceId]"
                            :title="'指标贡献柱状图'"
                            :categories="detailsMap[result.deviceId].bar.categories"
                            :values="detailsMap[result.deviceId].bar.values"
                          />
                          <el-empty v-else description="暂无数据" />
                        </el-card>
                      </el-col>
                    </el-row>
                  </el-tab-pane>
                </el-tabs>
                <el-empty v-else description="尚未执行评估" />
              </div>
            </el-col>
          </el-row>

          <el-divider />

          <div class="history-section">
            <div class="history-header">
              <h3>最近评估记录</h3>
              <el-button text type="danger" @click="clearHistory">清空历史</el-button>
            </div>
            <el-table :data="evaluationStore.history" border size="small">
              <el-table-column prop="deviceName" label="设备" />
              <el-table-column prop="systemId" label="系统" />
              <el-table-column prop="totalScore" label="综合得分">
                <template #default="{ row }">{{ row.totalScore.toFixed(1) }}</template>
              </el-table-column>
              <el-table-column prop="level" label="等级" />
              <el-table-column prop="evaluatedAt" label="评估时间" />
            </el-table>
            <TrendChart
              v-if="evaluationStore.history.length"
              :title="'综合得分趋势'"
              :categories="trendCategories"
              :values="trendValues"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-dialog v-model="schemeDialogVisible" title="权重方案列表" width="620px">
      <el-empty
        v-if="!schemeList.length"
        description="暂无权重方案，可先在上方保存一个方案"
      />
      <el-table v-else :data="schemeList" border size="small" class="scheme-table">
        <el-table-column prop="name" label="方案名称" />
        <el-table-column prop="method" label="来源">
          <template #default="{ row }">
            {{ schemeMethodLabel(row.method) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="200">
          <template #default="{ row }">
            {{ formatSchemeDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleExportScheme(row)">导出</el-button>
            <el-button type="danger" link @click="handleRemoveScheme(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox, ElTree } from 'element-plus';
import { useEvaluationStore } from '@/stores/evaluation';
import { useDeviceStore } from '@/stores/device';
import {
  ahpPowerIteration,
  applyWeightScheme,
  buildBarSeries,
  buildRadarSeries,
  computeDeviceScore,
  determineLevel,
  entropyWeights
} from '@/utils/evaluation';
import RadarChart from '@/charts/RadarChart.vue';
import BarChart from '@/charts/BarChart.vue';
import TrendChart from '@/charts/TrendChart.vue';
import type { DeviceEvaluationResult, IndicatorNode, WeightScheme } from '@/types/evaluation';

const evaluationStore = useEvaluationStore();
const deviceStore = useDeviceStore();

const treeRef = ref<InstanceType<typeof ElTree>>();
const activeIndicator = ref<IndicatorNode | null>(null);

const treeProps = {
  label: 'label',
  children: 'children'
};

const indicatorTreeData = computed(() => {
  const transform = (nodes: IndicatorNode[]): any[] =>
    nodes.map((node) => ({
      id: node.id,
      label: node.name,
      node,
      children: node.children ? transform(node.children) : undefined
    }));
  return transform(evaluationStore.activeSystem?.tree ?? []);
});

const expandedKeys = computed(() => indicatorTreeData.value.map((item) => item.id));

const indicatorList = computed(() => evaluationStore.selectedIndicators);

const directionLabel = (direction: string) => {
  switch (direction) {
    case 'positive':
      return '极大型指标（越大越好）';
    case 'negative':
      return '极小型指标（越小越好）';
    default:
      return '区间型指标（越接近区间越好）';
  }
};

const handleIndicatorCheck = (data: any, checked: any) => {
  if (data?.node) {
    activeIndicator.value = data.node;
  }
  const keys = (treeRef.value?.getCheckedKeys(true) as string[]) ?? [];
  evaluationStore.setIndicators(keys);
};

const selectAllIndicators = () => {
  const leaves: string[] = [];
  const walk = (items: any[]) => {
    items.forEach((item) => {
      if (!item.children?.length) {
        leaves.push(item.id);
      } else {
        walk(item.children);
      }
    });
  };
  walk(indicatorTreeData.value);
  evaluationStore.setIndicators(leaves);
};

const clearSelection = () => {
  evaluationStore.setIndicators([]);
};

const selectionValid = computed(() => evaluationStore.validateSelection());

const hasSameSelection = (current: string[], target: string[]) => {
  if (current.length !== target.length) {
    return false;
  }
  const currentSet = new Set(current);
  return target.every((key) => currentSet.has(key));
};

const syncTreeSelection = (keys: string[]) => {
  nextTick(() => {
    const tree = treeRef.value;
    if (!tree) {
      return;
    }
    const currentKeys = (tree.getCheckedKeys(true) as string[]) ?? [];
    if (hasSameSelection(currentKeys, keys)) {
      return;
    }
    tree.setCheckedKeys(keys);
  });
};

watch(
  () => evaluationStore.selectedIndicatorIds,
  (val) => {
    syncTreeSelection(val);
  }
);

watch(indicatorList, (list) => {
  if (!list.length) {
    activeIndicator.value = null;
  }
  if (list.length && !activeIndicator.value) {
    activeIndicator.value = list[0];
  }
  rebuildAhpMatrix();
  rebuildManualWeights();
  rebuildEntropySamples();
});

const activeWeightTab = ref('ahp');

// AHP
const ahpMatrix = ref<number[][]>([]);
const ahpResult = ref<{ weights: number[]; ci: number; cr: number; lambdaMax: number } | null>(null);

const rebuildAhpMatrix = () => {
  const size = indicatorList.value.length;
  ahpMatrix.value = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? 1 : 1))
  );
  ahpResult.value = null;
};

const handleAhpInput = (row: number, col: number, value: number) => {
  if (row === col) return;
  const sanitized = Math.min(Math.max(value || 1, 1 / 9), 9);
  ahpMatrix.value[row][col] = sanitized;
  ahpMatrix.value[col][row] = Number((1 / sanitized).toFixed(4));
};

const ahpTable = computed(() => {
  if (!ahpResult.value) return [];
  return indicatorList.value.map((indicator, index) => ({
    name: indicator.name,
    weight: ahpResult.value ? ahpResult.value.weights[index].toFixed(4) : '0'
  }));
});

const computeAHP = () => {
  if (!indicatorList.value.length) return;
  const matrix = ahpMatrix.value.map((row, rowIndex) =>
    row.map((value, colIndex) => (rowIndex === colIndex ? 1 : value))
  );
  const result = ahpPowerIteration(matrix);
  ahpResult.value = result;
  if (result.cr >= 0.1) {
    ElMessage.warning('一致性检验未通过，CR ≥ 0.1');
  } else {
    ElMessage.success('AHP 计算完成，一致性良好');
  }
};

const saveAhpScheme = () => {
  if (!ahpResult.value) return;
  const weights: Record<string, number> = {};
  indicatorList.value.forEach((indicator, index) => {
    weights[indicator.id] = Number(ahpResult.value!.weights[index].toFixed(4));
  });
  evaluationStore.saveWeightScheme({
    id: `scheme-ahp-${Date.now()}`,
    name: `AHP方案-${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    method: 'AHP',
    indicatorWeights: weights,
    description: '基于 AHP 的自动计算方案'
  });
  ElMessage.success('AHP 方案已保存');
};

// Entropy
interface EntropyRow {
  values: number[];
}

const entropySamples = ref<EntropyRow[]>([]);
const entropyResult = ref<number[] | null>(null);

const rebuildEntropySamples = () => {
  entropySamples.value = Array.from({ length: 3 }, () => ({
    values: indicatorList.value.map(() => 1)
  }));
  entropyResult.value = null;
};

const addEntropySample = () => {
  entropySamples.value.push({ values: indicatorList.value.map(() => 1) });
};

const removeEntropySample = (index: number) => {
  if (entropySamples.value.length <= 1) {
    ElMessage.warning('至少保留一个样本');
    return;
  }
  entropySamples.value.splice(index, 1);
};

const entropyTable = computed(() => {
  if (!entropyResult.value) return [];
  return indicatorList.value.map((indicator, index) => ({
    name: indicator.name,
    weight: entropyResult.value ? entropyResult.value[index].toFixed(4) : '0'
  }));
});

const computeEntropy = () => {
  if (!indicatorList.value.length) {
    ElMessage.warning('请选择指标');
    return;
  }
  const dataset = entropySamples.value.map((row) => row.values);
  const result = entropyWeights(dataset);
  entropyResult.value = result;
  ElMessage.success('熵权法权重已计算');
};

const saveEntropyScheme = () => {
  if (!entropyResult.value) return;
  const weights: Record<string, number> = {};
  indicatorList.value.forEach((indicator, index) => {
    weights[indicator.id] = Number(entropyResult.value![index].toFixed(4));
  });
  evaluationStore.saveWeightScheme({
    id: `scheme-entropy-${Date.now()}`,
    name: `熵权方案-${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    method: 'Entropy',
    indicatorWeights: weights,
    description: '基于熵权法计算的方案'
  });
  ElMessage.success('熵权方案已保存');
};

// Manual
const manualWeights = reactive<Record<string, number>>({});

const rebuildManualWeights = () => {
  indicatorList.value.forEach((indicator) => {
    if (!(indicator.id in manualWeights)) {
      manualWeights[indicator.id] = Number((1 / indicatorList.value.length).toFixed(4));
    }
  });
  Object.keys(manualWeights).forEach((key) => {
    if (!indicatorList.value.some((indicator) => indicator.id === key)) {
      delete manualWeights[key];
    }
  });
};

const manualTable = computed(() =>
  indicatorList.value.map((indicator) => ({ id: indicator.id, name: indicator.name }))
);

const manualWeightSum = computed(() =>
  Object.values(manualWeights).reduce((acc, cur) => acc + (Number(cur) || 0), 0)
);

const saveManualScheme = () => {
  if (Math.abs(manualWeightSum.value - 1) >= 0.01) {
    ElMessage.warning('权重和需为 1');
    return;
  }
  evaluationStore.saveWeightScheme({
    id: `scheme-manual-${Date.now()}`,
    name: `手工方案-${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    method: 'Manual',
    indicatorWeights: { ...manualWeights }
  });
  ElMessage.success('手工方案已保存');
};

watch(
  () => evaluationStore.activeScheme,
  (scheme) => {
    if (!scheme) return;
    Object.keys(manualWeights).forEach((key) => delete manualWeights[key]);
    Object.entries(scheme.indicatorWeights).forEach(([key, value]) => {
      manualWeights[key] = Number(value.toFixed(4));
    });
  },
  { immediate: true }
);

const schemeDialogVisible = ref(false);
const schemeList = computed(() => evaluationStore.weightSchemes);

const schemeMethodLabel = (method: WeightScheme['method']) => {
  switch (method) {
    case 'AHP':
      return 'AHP 计算';
    case 'Entropy':
      return '熵权法';
    case 'Manual':
      return '手工录入';
    default:
      return method;
  }
};

const formatSchemeDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const handleExportScheme = (scheme: WeightScheme) => {
  const fileName = scheme.name.replace(/[\\/:*?"<>|]/g, '_') || '权重方案';
  const content = JSON.stringify(scheme, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('方案已导出');
};

const handleRemoveScheme = (scheme: WeightScheme) => {
  ElMessageBox.confirm(`确认删除方案「${scheme.name}」？`, '提示', { type: 'warning' }).then(() => {
    evaluationStore.deleteWeightScheme(scheme.id);
    ElMessage.success('方案已删除');
  }).catch(() => void 0);
};

const handleImportSchemes = (file: any) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      evaluationStore.importSchemes(String(event.target?.result ?? ''));
      ElMessage.success('导入成功');
    } catch (error) {
      console.error(error);
      ElMessage.error('导入失败，请检查 JSON 格式');
    }
  };
  reader.readAsText(file.raw);
};

// Evaluation
const evaluationSystemId = ref(deviceStore.currentSystemId);
const selectedDeviceIds = ref<string[]>([]);
const selectedSchemeId = ref(evaluationStore.activeSchemeId);
const evaluationResults = ref<DeviceEvaluationResult[]>([]);
const activeResultId = ref<string>('');
const detailsMap = reactive<Record<
  string,
  { radar: ReturnType<typeof buildRadarSeries>; bar: ReturnType<typeof buildBarSeries> }
>>({});

const availableDevices = computed(() =>
  deviceStore.devices.filter((device) => device.systemId === evaluationSystemId.value)
);

watch(
  () => evaluationSystemId.value,
  () => {
    selectedDeviceIds.value = availableDevices.value.slice(0, 3).map((item) => item.id);
  },
  { immediate: true }
);

watch(
  () => evaluationStore.weightSchemes,
  () => {
    if (!evaluationStore.weightSchemes.length) return;
    if (!selectedSchemeId.value) {
      selectedSchemeId.value = evaluationStore.weightSchemes[0].id;
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => evaluationStore.activeSchemeId,
  (id) => {
    if (id) {
      selectedSchemeId.value = id;
    }
  },
  { immediate: true }
);

watch(
  () => selectedSchemeId.value,
  (id) => {
    if (id && id !== evaluationStore.activeSchemeId) {
      evaluationStore.setActiveScheme(id);
    }
  }
);

const canEvaluate = computed(
  () => selectedDeviceIds.value.length > 0 && Boolean(selectedSchemeId.value) && selectionValid.value
);

const gradeTagType = (level: string) => {
  switch (level) {
    case 'A':
      return 'success';
    case 'B':
      return 'info';
    case 'C':
      return 'warning';
    default:
      return 'danger';
  }
};

const formatRawValue = (value: number | string) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '-';
  }
  return value;
};

const handleEvaluate = () => {
  if (!canEvaluate.value) {
    ElMessage.warning('请完善选择');
    return;
  }
  const scheme = evaluationStore.weightSchemes.find((item) => item.id === selectedSchemeId.value);
  if (!scheme) {
    ElMessage.error('未找到权重方案');
    return;
  }
  const indicators = evaluationStore.selectedIndicators;
  const weightMap = applyWeightScheme(scheme, indicators);
  const selectedDevices = deviceStore.devices.filter((device) =>
    selectedDeviceIds.value.includes(device.id)
  );
  const datasets: Record<string, number[]> = {};
  indicators.forEach((indicator) => {
    datasets[indicator.id] = selectedDevices
      .map((device) => device.metrics.find((item) => item.indicatorId === indicator.id)?.value)
      .filter((value): value is number => typeof value === 'number');
  });

  const now = new Date().toISOString();
  const results = selectedDevices.map((device) => {
    const { total, details } = computeDeviceScore(device, indicators, weightMap, datasets);
    const level = determineLevel(total);
    deviceStore.recordEvaluation({ id: device.id, score: total, level, evaluatedAt: now });
    return {
      deviceId: device.id,
      deviceName: device.name,
      systemId: device.systemId,
      totalScore: total,
      level,
      evaluatedAt: now,
      details
    };
  });
  evaluationResults.value = results;
  activeResultId.value = results[0]?.deviceId ?? '';
  evaluationStore.appendEvaluationHistory(results);
  results.forEach((result) => {
    detailsMap[result.deviceId] = {
      radar: buildRadarSeries(result.details),
      bar: buildBarSeries(result.details)
    };
  });
  ElMessage.success('评估完成，结果已更新');
};

const exportEvaluation = () => {
  if (!evaluationResults.value.length) return;
  const content = JSON.stringify(evaluationResults.value, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '评估结果.json';
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('评估结果已导出');
};

const clearHistory = () => {
  ElMessageBox.confirm('确认清空历史记录？', '提示', { type: 'warning' }).then(() => {
    evaluationStore.clearHistory();
  });
};

const trendCategories = computed(() =>
  evaluationStore.history.map((item) => new Date(item.evaluatedAt).toLocaleString()).reverse()
);
const trendValues = computed(() => evaluationStore.history.map((item) => item.totalScore).reverse());
</script>

<style scoped>
.evaluation-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.module-card {
  border-radius: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.card-header p {
  margin: 4px 0 0;
  color: var(--muted-color);
}

.inner-card {
  border-radius: 12px;
  background: #ffffff;
}

.inner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.indicator-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.indicator-detail h3 {
  margin: 0;
}

.indicator-detail .definition {
  margin: 0;
  color: var(--muted-color);
}

.selection-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mt-12 {
  margin-top: 12px;
}

.tab-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.matrix-table {
  overflow-x: auto;
}

.matrix-table table {
  width: 100%;
  border-collapse: collapse;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #e4e7ed;
  padding: 8px;
  text-align: center;
}

.tab-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.scheme-upload :deep(.el-upload) {
  display: inline-flex;
  align-items: center;
}

.scheme-upload :deep(.el-button) {
  height: 32px;
  line-height: 32px;
}

.scheme-table {
  margin-top: 8px;
}

.empty-tip {
  padding: 40px 0;
}

.device-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.results-area {
  min-height: 360px;
}

.result-grid {
  margin-bottom: 16px;
}

.result-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  border-radius: 12px;
}

.score-card .detail-list {
  flex: 1;
  overflow-y: auto;
}

.chart-card {
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-card :deep(.chart) {
  width: 100%;
}

.score-block {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-block h3 {
  margin: 0;
}

.score {
  font-size: 32px;
  font-weight: 600;
  color: #165dff;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-list li {
  display: flex;
  justify-content: space-between;
  color: var(--text-color);
  font-size: 14px;
}

.history-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
