<template>
  <div ref="chartRef" class="chart" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart as EBarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([EBarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

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
      axisLabel: { color: '#1f2d3d', interval: 0, rotate: 18 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#1f2d3d' }
    },
    series: [
      {
        name: '贡献度',
        type: 'bar',
        data: props.values,
        itemStyle: {
          color: '#165dff',
          borderRadius: [6, 6, 0, 0]
        }
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
  height: 320px;
}
</style>
