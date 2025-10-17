<template>
  <div ref="chartRef" class="chart" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { RadarChart as ERadarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([ERadarChart, TitleComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const props = defineProps<{
  title: string;
  indicator: { name: string; max: number }[];
  value: number[];
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
    tooltip: {},
    radar: {
      indicator: props.indicator,
      radius: '60%',
      splitNumber: 5,
      axisName: {
        color: '#1f2d3d'
      }
    },
    series: [
      {
        name: '指标得分',
        type: 'radar',
        data: [
          {
            value: props.value,
            areaStyle: {
              color: 'rgba(22,93,255,0.35)'
            },
            lineStyle: {
              color: '#165dff'
            },
            symbolSize: 6
          }
        ]
      }
    ]
  });
};

const resize = () => {
  chart?.resize();
};

onMounted(() => {
  render();
  window.addEventListener('resize', resize);
});

watch(
  [() => props.title, () => props.indicator, () => props.value],
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
