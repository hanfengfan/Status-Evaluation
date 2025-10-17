<template>
  <div class="login-wrapper">
    <div class="login-header">
      <h1>城市轨道交通供电设备状态评估系统</h1>
      <!-- <p>Urban Rail Traction Power Assessment</p> -->
    </div>
    <el-card class="login-card" shadow="always">
      <el-tabs v-model="activeTab" class="login-tabs">
        <el-tab-pane label="用户登录" name="user" />
        <el-tab-pane label="管理员登录" name="admin" />
      </el-tabs>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @keyup.enter="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="submit-btn" :loading="loading" @click="handleSubmit">
            进入系统
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElForm, ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

type LoginForm = {
  username: string;
  password: string;
};

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const activeTab = ref<'user' | 'admin'>('user');
const loading = ref(false);

const form = reactive<LoginForm>({
  username: '',
  password: ''
});

const formRef = ref<InstanceType<typeof ElForm>>();

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

watch(activeTab, () => {
  form.username = '';
  form.password = '';
});

const handleSubmit = () => {
  formRef.value?.validate(async (valid) => {
    if (!valid) {
      return;
    }
    loading.value = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      auth.login({ username: form.username, role: activeTab.value });
      ElMessage.success('登录成功，欢迎回来');
      const redirect = (route.query.redirect as string) ?? '/app';
      router.push(redirect);
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.login-wrapper {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, rgba(22, 93, 255, 0.2), transparent 60%),
    #f5f7fb;
  padding: 48px 20px;
}

.login-header {
  text-align: center;
  color: var(--text-color);
  margin-bottom: 32px;
}

.login-header h1 {
  margin: 0;
  font-size: 36px;
}

.login-header p {
  margin-top: 8px;
  color: var(--muted-color);
  letter-spacing: 1px;
}

.login-card {
  width: 460px;
  height: auto;
  border-radius: 20px;
  box-shadow: 0 20px 45px rgba(22, 93, 255, 0.15);
  border: none;
  /* 如果需要控制高度，可以增加height，比如：height: 350px; */
}

.login-tabs :deep(.el-tabs__item) {
  font-size: 18px;
}

.submit-btn {
  width: 100%;
}
</style>
