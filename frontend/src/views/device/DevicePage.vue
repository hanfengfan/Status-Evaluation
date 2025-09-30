<template>
  <div class="device-page">
    <el-card class="toolbar-card" shadow="hover">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="deviceStore.currentSystemId" placeholder="选择设备系统" @change="handleSystemChange">
            <el-option
              v-for="system in deviceStore.systems"
              :key="system.id"
              :label="system.name"
              :value="system.id"
            />
          </el-select>
          <el-input
            v-model="deviceStore.filter.keyword"
            placeholder="搜索名称/编码/位置"
            clearable
            :prefix-icon="Search"
            class="filter-item"
          />
          <el-select v-model="deviceStore.filter.status" class="filter-item" style="width: 140px">
            <el-option label="全部状态" value="全部" />
            <el-option label="正常" value="正常" />
            <el-option label="关注" value="关注" />
            <el-option label="预警" value="预警" />
            <el-option label="严重" value="严重" />
          </el-select>
          <el-select v-model="deviceStore.filter.category" class="filter-item" style="width: 180px">
            <el-option label="全部设备类型" value="全部" />
            <el-option
              v-for="category in currentSystem?.categories ?? []"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button v-if="isAdmin" type="primary" :icon="Plus" @click="handleCreate">
            新增设备
          </el-button>
          <el-button type="default" :icon="Download" @click="exportDevices">导出JSON</el-button>
        </div>
      </div>
    </el-card>

    <el-empty v-if="!deviceStore.filteredDevices.length" description="暂无符合条件的设备" />

    <div v-else class="device-grid">
      <el-card
        v-for="device in deviceStore.filteredDevices"
        :key="device.id"
        shadow="hover"
        class="device-card"
      >
        <div class="card-header">
          <div>
            <h3>{{ device.name }}</h3>
            <p class="code">编码：{{ device.code }}</p>
          </div>
          <el-tag :type="statusTagType(device.status)" effect="dark">{{ device.status }}</el-tag>
        </div>
        <div class="card-body">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="系统">{{ systemName(device.systemId) }}</el-descriptions-item>
            <el-descriptions-item label="分类">{{ device.category }}</el-descriptions-item>
            <el-descriptions-item label="位置">{{ device.location }}</el-descriptions-item>
            <el-descriptions-item label="投运日期">{{ device.commissionDate }}</el-descriptions-item>
            <el-descriptions-item label="上次评估">{{ device.lastEvalAt ?? '未评估' }}</el-descriptions-item>
            <el-descriptions-item label="综合得分">{{ device.score ? device.score.toFixed(1) : '—' }}</el-descriptions-item>
          </el-descriptions>
          <div class="params">
            <h4>关键参数</h4>
            <el-row :gutter="12">
              <el-col v-for="(value, key) in device.keyParams" :key="key" :span="12">
                <div class="param-item">
                  <span class="label">{{ key }}</span>
                  <span class="value">{{ value }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
        <div class="card-footer">
          <el-button type="primary" text size="small" @click="handleEdit(device)">
            编辑
          </el-button>
          <el-button
            v-if="isAdmin"
            type="danger"
            text
            size="small"
            @click="handleDelete(device.id)"
          >
            删除
          </el-button>
        </div>
      </el-card>
    </div>

    <el-drawer v-model="drawerVisible" size="520px" :title="drawerTitle">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="98px">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="form.name" :disabled="!isAdmin" />
        </el-form-item>
        <el-form-item label="设备编码" prop="code">
          <el-input v-model="form.code" :disabled="formMode === 'edit' || !isAdmin" />
        </el-form-item>
        <el-form-item label="所属系统" prop="systemId">
          <el-select v-model="form.systemId" :disabled="!isAdmin">
            <el-option
              v-for="system in deviceStore.systems"
              :key="system.id"
              :label="system.name"
              :value="system.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型" prop="category">
          <el-select v-model="form.category" :disabled="!isAdmin">
            <el-option
              v-for="category in availableCategories"
              :key="category"
              :label="category"
              :value="category"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="安装位置" prop="location">
          <el-input v-model="form.location" :disabled="!isAdmin" />
        </el-form-item>
        <el-form-item label="投运日期" prop="commissionDate">
          <el-date-picker
            v-model="form.commissionDate"
            value-format="YYYY-MM-DD"
            :disabled="!isAdmin"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" :disabled="!isAdmin">
            <el-option label="正常" value="正常" />
            <el-option label="关注" value="关注" />
            <el-option label="预警" value="预警" />
            <el-option label="严重" value="严重" />
          </el-select>
        </el-form-item>
        <el-divider>关键参数</el-divider>
        <div class="key-params">
          <div
            v-for="(item, index) in form.keyParams"
            :key="index"
            class="key-param-row"
          >
            <el-input v-model="item.key" placeholder="参数名称" :disabled="!isAdmin && index < lockedParamCount" />
            <el-input v-model="item.value" placeholder="参数值" />
            <el-button
              v-if="isAdmin || index >= lockedParamCount"
              type="danger"
              text
              @click="removeParam(index)"
            >
              移除
            </el-button>
          </div>
          <el-button type="primary" text :icon="Plus" @click="addParam">新增参数</el-button>
        </div>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElForm, ElMessage, ElMessageBox } from 'element-plus';
import { Download, Plus, Search } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { useDeviceStore } from '@/stores/device';
import type { DeviceRecord } from '@/types/device';

const auth = useAuthStore();
const deviceStore = useDeviceStore();

const isAdmin = computed(() => auth.role === 'admin');
const currentSystem = computed(() =>
  deviceStore.systems.find((item) => item.id === deviceStore.currentSystemId)
);

const availableCategories = computed(() => currentSystem.value?.categories ?? []);

const handleSystemChange = (id: string) => {
  deviceStore.setSystem(id);
};

const systemName = (id: string) => deviceStore.systems.find((sys) => sys.id === id)?.name ?? '—';

const statusTagType = (status: string) => {
  switch (status) {
    case '正常':
      return 'success';
    case '关注':
      return 'info';
    case '预警':
      return 'warning';
    default:
      return 'danger';
  }
};

type FormMode = 'create' | 'edit';

const drawerVisible = ref(false);
const formMode = ref<FormMode>('create');
const saving = ref(false);

interface KeyParamRow {
  key: string;
  value: string | number;
}

const form = reactive({
  id: '',
  name: '',
  code: '',
  systemId: deviceStore.currentSystemId,
  category: '',
  location: '',
  commissionDate: '',
  status: '正常',
  ownerRole: auth.role,
  keyParams: [] as KeyParamRow[],
  metrics: [] as DeviceRecord['metrics']
});

const lockedParamCount = ref(0);

watch(
  () => form.systemId,
  (val) => {
    if (!val) return;
    const categories = deviceStore.systems.find((item) => item.id === val)?.categories ?? [];
    if (!categories.includes(form.category)) {
      form.category = categories[0] ?? '';
    }
  }
);

const rules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入设备编码', trigger: 'blur' }],
  systemId: [{ required: true, message: '请选择系统', trigger: 'change' }],
  category: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  location: [{ required: true, message: '请输入安装位置', trigger: 'blur' }],
  commissionDate: [{ required: true, message: '请选择投运日期', trigger: 'change' }]
};

const formRef = ref<InstanceType<typeof ElForm>>();

const resetForm = () => {
  form.id = '';
  form.name = '';
  form.code = '';
  form.systemId = deviceStore.currentSystemId;
  form.category = availableCategories.value[0] ?? '';
  form.location = '';
  form.commissionDate = '';
  form.status = '正常';
  form.ownerRole = auth.role;
  form.keyParams = [];
  form.metrics = [];
  lockedParamCount.value = 0;
};

const toParamRows = (params: Record<string, string | number>): KeyParamRow[] => {
  return Object.entries(params).map(([key, value]) => ({ key, value }));
};

const fromParamRows = (rows: KeyParamRow[]) => {
  return rows.reduce<Record<string, string | number>>((acc, cur) => {
    if (cur.key) {
      acc[cur.key] = cur.value;
    }
    return acc;
  }, {});
};

const handleCreate = () => {
  resetForm();
  formMode.value = 'create';
  drawerVisible.value = true;
};

const handleEdit = (device: DeviceRecord) => {
  formMode.value = 'edit';
  form.id = device.id;
  form.name = device.name;
  form.code = device.code;
  form.systemId = device.systemId;
  form.category = device.category;
  form.location = device.location;
  form.commissionDate = device.commissionDate;
  form.status = device.status;
  form.ownerRole = device.ownerRole;
  form.keyParams = toParamRows(device.keyParams);
  form.metrics = JSON.parse(JSON.stringify(device.metrics));
  lockedParamCount.value = device.ownerRole === 'admin' ? 0 : form.keyParams.length;
  drawerVisible.value = true;
};

const drawerTitle = computed(() => (formMode.value === 'create' ? '新增设备' : '编辑设备'));

const addParam = () => {
  form.keyParams.push({ key: '', value: '' });
};

const removeParam = (index: number) => {
  form.keyParams.splice(index, 1);
};

const handleSave = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      const payload: DeviceRecord = {
        id: formMode.value === 'create' ? form.code : form.id,
        name: form.name,
        code: form.code,
        systemId: form.systemId,
        category: form.category,
        location: form.location,
        commissionDate: form.commissionDate,
        status: form.status,
        ownerRole: form.ownerRole,
        keyParams: fromParamRows(form.keyParams),
        metrics: form.metrics
      };
      if (formMode.value === 'create') {
        deviceStore.upsertDevice(payload);
      } else {
        deviceStore.updateDevice(payload.id, payload);
      }
      ElMessage.success('保存成功');
      drawerVisible.value = false;
    } finally {
      saving.value = false;
    }
  });
};

const handleDelete = (id: string) => {
  ElMessageBox.confirm('确认删除该设备吗？操作不可恢复', '提示', {
    type: 'warning'
  }).then(() => {
    deviceStore.removeDevice(id);
    ElMessage.success('设备已删除');
  });
};

const exportDevices = () => {
  const data = JSON.stringify(deviceStore.filteredDevices, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentSystem.value?.name ?? '设备'}-列表.json`;
  a.click();
  URL.revokeObjectURL(url);
  ElMessage.success('导出成功');
};
</script>

<style scoped>
.device-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.toolbar-card {
  border-radius: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-item {
  width: 220px;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.device-card {
  border-radius: 16px;
  border: none;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 340px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  color: var(--text-color);
}

.card-header .code {
  margin: 4px 0 0;
  color: var(--muted-color);
  font-size: 13px;
}

.params {
  margin-top: 12px;
}

.params h4 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--text-color);
}

.param-item {
  background: rgba(22, 93, 255, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.param-item .label {
  color: var(--muted-color);
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.key-params {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.key-param-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
