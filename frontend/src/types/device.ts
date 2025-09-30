export type DeviceStatus = '正常' | '关注' | '预警' | '严重';

export interface DeviceMetric {
  indicatorId: string;
  name: string;
  value: number | string;
  unit?: string;
  updatedAt: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  code: string;
  systemId: string;
  category: string;
  location: string;
  commissionDate: string;
  status: DeviceStatus;
  keyParams: Record<string, string | number>;
  ownerRole: 'user' | 'admin';
  metrics: DeviceMetric[];
  lastEvalAt?: string;
  score?: number;
}

export interface DeviceSystem {
  id: string;
  name: string;
  description?: string;
  categories: string[];
}

export interface DeviceFilter {
  keyword: string;
  status: DeviceStatus | '全部';
  category: string | '全部';
}
