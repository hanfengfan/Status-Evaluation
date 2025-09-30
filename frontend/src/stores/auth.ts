import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';

type Role = 'user' | 'admin';

const STORAGE_KEY = 'urban-rail-auth';

interface PersistedAuthState {
  username: string | null;
  role: Role;
  isAuthenticated: boolean;
}

const getInitialState = (): PersistedAuthState => {
  if (typeof window === 'undefined') {
    return { username: null, role: 'user', isAuthenticated: false };
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { username: null, role: 'user', isAuthenticated: false };
    }
    const parsed = JSON.parse(stored) as PersistedAuthState;
    return {
      username: parsed.username ?? null,
      role: parsed.role ?? 'user',
      isAuthenticated: parsed.isAuthenticated ?? false
    };
  } catch (error) {
    console.warn('读取登录状态失败', error);
    return { username: null, role: 'user', isAuthenticated: false };
  }
};

export const useAuthStore = defineStore('auth', () => {
  const state = reactive<PersistedAuthState>(getInitialState());

  const role = computed(() => state.role);
  const username = computed(() => state.username ?? '访客');
  const isAuthenticated = computed(() => state.isAuthenticated);

  const login = (payload: { username: string; role: Role }) => {
    state.username = payload.username;
    state.role = payload.role;
    state.isAuthenticated = true;
  };

  const logout = () => {
    state.username = null;
    state.role = 'user';
    state.isAuthenticated = false;
  };

  if (typeof window !== 'undefined') {
    watch(
      () => ({ ...state }),
      (val) => {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      },
      { deep: true }
    );
  }

  return {
    role,
    username,
    isAuthenticated,
    login,
    logout,
    state
  };
});
