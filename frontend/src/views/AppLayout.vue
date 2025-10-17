<template>
  <el-container class="app-shell">
    <el-aside width="240px" class="app-aside">
      <div class="logo">城市轨道交通供电设备状态评估系统</div>
      <el-menu
        :default-active="activeMenu"
        class="nav-menu"
        background-color="transparent"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/app/device">
          <el-icon><Monitor /></el-icon>
          <span>设备管理</span>
        </el-menu-item>
        <el-menu-item index="/app/eval">
          <el-icon><DataLine /></el-icon>
          <span>设备评估</span>
        </el-menu-item>
        <el-menu-item index="/app/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <h1>城市轨道交通供电设备状态评估系统</h1>
          <!-- <p>Urban Rail Traction Power Assessment</p> -->
        </div>
        <div class="header-right">
          <el-tag type="info" effect="dark" class="role-tag">
            当前角色：{{ roleLabel }}
          </el-tag>
          <el-dropdown trigger="click">
            <span class="user-entry">
              <el-avatar size="small">{{ initials }}</el-avatar>
              <span class="username">{{ auth.username }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="toggleTheme">
                  <el-icon><Moon /></el-icon>
                  <span>主题切换</span>
                </el-dropdown-item>
                <el-dropdown-item divided @click="onLogout">
                  <el-icon><SwitchButton /></el-icon>
                  <span>退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { DataLine, Monitor, Moon, Setting, SwitchButton } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const STORAGE_KEY = 'urban-rail-active-menu';
const activeMenu = ref<string>(route.path.startsWith('/app') ? route.path : '/app/device');

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    activeMenu.value = stored;
    if (stored !== route.path) {
      router.replace(stored).catch(() => void 0);
    }
  }
});

watch(
  () => route.path,
  (val) => {
    if (val.startsWith('/app')) {
      activeMenu.value = val;
      localStorage.setItem(STORAGE_KEY, val);
    }
  }
);

const handleMenuSelect = (index: string) => {
  router.push(index);
};

const roleLabel = computed(() => (auth.role === 'admin' ? '管理员' : '普通用户'));

const initials = computed(() => (auth.username?.charAt(0) ?? '访'));

const onLogout = () => {
  auth.logout();
  localStorage.removeItem(STORAGE_KEY);
  router.push('/login');
  ElMessage.success('您已退出系统');
};

const theme = ref<'light' | 'dark'>('light');

const applyTheme = () => {
  const body = document.body;
  body.setAttribute('data-theme', theme.value);
  if (theme.value === 'dark') {
    body.style.backgroundColor = '#101828';
    body.style.color = '#f8fafc';
  } else {
    body.style.backgroundColor = '#f2f4f8';
    body.style.color = 'var(--text-color)';
  }
};

const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  applyTheme();
  ElMessage.info(`切换为${theme.value === 'dark' ? '暗色' : '亮色'}主题`);
};

watch(theme, () => applyTheme());

applyTheme();
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7faff 0%, #eef3ff 100%);
}

.app-aside {
  background: rgba(22, 93, 255, 0.08);
  border-right: 1px solid rgba(22, 93, 255, 0.15);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.logo {
  font-weight: 600;
  font-size: 18px;
  line-height: 24px;
  color: var(--primary-color);
  text-align: center;
  padding: 12px 8px;
  border-radius: 12px;
  background: rgba(22, 93, 255, 0.12);
}

.nav-menu {
  flex: 1;
  background: transparent;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: #ffffff;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  color: var(--text-color);
}

.header-left p {
  margin: 4px 0 0;
  color: var(--muted-color);
  font-size: 12px;
  letter-spacing: 0.8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(22, 93, 255, 0.08);
  color: var(--text-color);
}

.username {
  font-weight: 500;
}

.role-tag {
  border-radius: 999px;
}

.app-main {
  background: #f5f7fb;
  padding: 24px 32px 40px;
  min-height: calc(100vh - 120px);
}
</style>
