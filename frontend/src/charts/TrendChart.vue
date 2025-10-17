<template>
  <div ref="chartRef" class="chart" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart as ELineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([ELineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps<{
  title: string;
  categories: string[];
  values: number[];
}>();

const chartRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;

const render = () => {
  if (!chartRef.value) return;
  if (!chart) {
    chart = echarts.init(chartRef.value);
  }
  chart.setOption({
    title: { text: props.title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '3%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: props.categories,
      boundaryGap: false,
      axisLabel: { color: '#1f2d3d' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#1f2d3d' },
      min: 0,
      max: 100
    },
    series: [
      {
        name: '综合得分',
        type: 'line',
        data: props.values,
        smooth: true,
        areaStyle: { color: 'rgba(22,93,255,0.15)' },
        lineStyle: { color: '#165dff', width: 2 },
        symbolSize: 8
      }
    ]
  });
};

const resize = () => chart?.resize();

onMounted(() => {
  render();
  window.addEventListener('resize', resize);
});

watch(
  [() => props.title, () => props.categories, () => props.values],
  () => {
    render();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize);
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
.chart {
  width: 100%;
  height: 280px;
}
</style>
