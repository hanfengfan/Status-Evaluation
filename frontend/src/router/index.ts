import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/app',
    name: 'app',
    component: () => import('@/views/AppLayout.vue'),
    children: [
      { path: '', redirect: '/app/device' },
      {
        path: 'device',
        name: 'device',
        component: () => import('@/views/device/DevicePage.vue')
      },
      {
        path: 'eval',
        name: 'evaluation',
        component: () => import('@/views/eval/EvaluationPage.vue')
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SystemSettings.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      next('/app');
    } else {
      next();
    }
    return;
  }

  if (!auth.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } });
    return;
  }

  next();
});

export default router;
