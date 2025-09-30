import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { deviceSystems, seedDevices } from '@/config/powerEvaluationConfig';
import type { DeviceFilter, DeviceRecord, DeviceStatus, DeviceSystem } from '@/types/device';

const STORAGE_KEY = 'urban-rail-devices';

const getPersistedDevices = (): DeviceRecord[] => {
  if (typeof window === 'undefined') {
    return [...seedDevices];
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [...seedDevices];
    }
    const parsed = JSON.parse(stored) as DeviceRecord[];
    return parsed.length ? parsed : [...seedDevices];
  } catch (error) {
    console.error('加载设备数据失败', error);
    return [...seedDevices];
  }
};

export const useDeviceStore = defineStore('device', () => {
  const systems = ref<DeviceSystem[]>(deviceSystems);
  const devices = ref<DeviceRecord[]>(getPersistedDevices());

  const filter = reactive<DeviceFilter>({
    keyword: '',
    status: '全部',
    category: '全部'
  });

  const currentSystemId = ref<string>(systems.value[0]?.id ?? '');

  const filteredDevices = computed(() => {
    return devices.value.filter((item) => {
      if (item.systemId !== currentSystemId.value) {
        return false;
      }
      if (filter.status !== '全部' && item.status !== filter.status) {
        return false;
      }
      if (filter.category !== '全部' && item.category !== filter.category) {
        return false;
      }
      if (filter.keyword) {
        const keyword = filter.keyword.trim().toLowerCase();
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.code.toLowerCase().includes(keyword) ||
          item.location.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  });

  const setSystem = (id: string) => {
    currentSystemId.value = id;
    const currentSystem = systems.value.find((sys) => sys.id === id);
    if (currentSystem) {
      filter.category = '全部';
    }
  };

  const addDevice = (record: DeviceRecord) => {
    devices.value.push(record);
  };

  const updateDevice = (id: string, payload: Partial<DeviceRecord>) => {
    const index = devices.value.findIndex((item) => item.id === id);
    if (index !== -1) {
      devices.value[index] = { ...devices.value[index], ...payload };
    }
  };

  const upsertDevice = (record: DeviceRecord) => {
    const index = devices.value.findIndex((item) => item.id === record.id);
    if (index === -1) {
      addDevice(record);
    } else {
      devices.value[index] = { ...devices.value[index], ...record };
    }
  };

  const removeDevice = (id: string) => {
    devices.value = devices.value.filter((item) => item.id !== id);
  };

  const setDeviceStatus = (id: string, status: DeviceStatus) => {
    const device = devices.value.find((item) => item.id === id);
    if (device) {
      device.status = status;
    }
  };

  const recordEvaluation = (payload: { id: string; score: number; level: string; evaluatedAt: string }) => {
    const device = devices.value.find((item) => item.id === payload.id);
    if (device) {
      device.score = payload.score;
      device.status =
        payload.level === 'A'
          ? '正常'
          : payload.level === 'B'
          ? '关注'
          : payload.level === 'C'
          ? '预警'
          : '严重';
      device.lastEvalAt = payload.evaluatedAt;
    }
  };

  if (typeof window !== 'undefined') {
    watch(
      devices,
      (val) => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      },
      { deep: true }
    );
  }

  return {
    systems,
    devices,
    filter,
    currentSystemId,
    filteredDevices,
    setSystem,
    addDevice,
    upsertDevice,
    updateDevice,
    removeDevice,
    setDeviceStatus,
    recordEvaluation
  };
});
