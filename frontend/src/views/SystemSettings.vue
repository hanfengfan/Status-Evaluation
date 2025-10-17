<template>
  <div class="settings-page">
    <el-page-header content="系统设置" />
    <div class="settings-content">
      <el-card shadow="hover" class="settings-card">
        <template #header>
          <div class="card-header">
            <h2>系统配置</h2>
            <span>调整平台的基础信息、通知策略与安全策略</span>
          </div>
        </template>

        <el-tabs v-model="activeTab">
          <el-tab-pane label="基础信息" name="general">
            <el-form :model="generalForm" label-width="120px" class="section-form">
              <el-form-item label="系统名称">
                <el-input v-model="generalForm.systemName" placeholder="请输入系统名称" />
              </el-form-item>
              <el-form-item label="默认主题">
                <el-radio-group v-model="generalForm.theme">
                  <el-radio-button label="light">亮色</el-radio-button>
                  <el-radio-button label="dark">暗色</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="默认设备体系">
                <el-select v-model="generalForm.defaultSystem" placeholder="请选择体系">
                  <el-option
                    v-for="system in systemOptions"
                    :key="system.id"
                    :label="system.name"
                    :value="system.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="界面语言">
                <el-select v-model="generalForm.locale" placeholder="请选择界面语言">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </el-form-item>
              <div class="form-actions">
                <el-button type="primary" :loading="saving.general" @click="handleSave('general')">
                  保存设置
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="通知提醒" name="notification">
            <el-form :model="notificationForm" label-width="120px" class="section-form">
              <el-form-item label="接收渠道">
                <el-checkbox-group v-model="notificationForm.channels">
                  <el-checkbox label="email">邮件</el-checkbox>
                  <el-checkbox label="sms">短信</el-checkbox>
                  <el-checkbox label="inbox">站内信</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
              <el-form-item label="每日摘要">
                <el-switch v-model="notificationForm.dailySummary" />
              </el-form-item>
              <el-form-item label="导出完成提示">
                <el-switch v-model="notificationForm.exportHint" />
              </el-form-item>
              <div class="form-actions">
                <el-button type="primary" :loading="saving.notification" @click="handleSave('notification')">
                  保存设置
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="安全策略" name="security">
            <el-form :model="securityForm" label-width="120px" class="section-form">
              <el-form-item label="两步验证">
                <el-switch v-model="securityForm.twoFactor" />
              </el-form-item>
              <el-form-item label="自动退出">
                <el-select v-model="securityForm.autoLogout" placeholder="请选择空闲时间">
                  <el-option label="15 分钟" value="15" />
                  <el-option label="30 分钟" value="30" />
                  <el-option label="60 分钟" value="60" />
                </el-select>
              </el-form-item>
              <el-form-item label="最近修改">
                <el-input v-model="securityForm.passwordUpdatedAt" disabled />
              </el-form-item>
              <el-alert
                title="启用两步验证后，登录需额外短信或动态口令验证"
                type="info"
                show-icon
              />
              <div class="form-actions">
                <el-button type="primary" :loading="saving.security" @click="handleSave('security')">
                  保存设置
                </el-button>
              </div>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </el-card>

    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { deviceSystems } from '@/config/powerEvaluationConfig';

const activeTab = ref('general');

const systemOptions = deviceSystems.map((item) => ({ id: item.id, name: item.name }));

const generalForm = reactive({
  systemName: '城市轨道供电评估系统',
  theme: 'light',
  defaultSystem: systemOptions[0]?.id ?? '',
  locale: 'zh-CN'
});

const notificationForm = reactive({
  channels: ['email', 'inbox'],
  dailySummary: true,
  exportHint: true
});

const securityForm = reactive({
  twoFactor: true,
  autoLogout: '30',
  passwordUpdatedAt: '2024-09-15 09:30'
});

const saving = reactive({
  general: false,
  notification: false,
  security: false
});

type SectionKey = keyof typeof saving;

const handleSave = (section: SectionKey) => {
  if (saving[section]) {
    return;
  }
  saving[section] = true;
  window.setTimeout(() => {
    saving[section] = false;
    ElMessage.success('设置已保存');
  }, 500);
};
</script>

<style scoped>
.settings-page {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-card {
  border-radius: 16px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
}

.card-header span {
  color: var(--muted-color);
}

.section-form {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

</style>
