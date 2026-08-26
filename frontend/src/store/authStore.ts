import { create } from 'zustand';
import { Platform } from 'react-native';
import { User } from '../types';
import api from '../utils/api';
import { configurePurchases, logOutPurchases } from '../utils/purchases';

// Safe storage wrapper that handles errors gracefully
const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } else {
        // Dynamic import for mobile
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (AsyncStorage) {
          return await AsyncStorage.getItem(key);
        }
      }
    } catch (error) {
      console.log('Storage getItem error (using memory fallback):', key);
    }
    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (AsyncStorage) {
          await AsyncStorage.setItem(key, value);
          return;
        }
      }
    } catch (error) {
      console.log('Storage setItem error (using memory fallback):', key);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (AsyncStorage) {
          await AsyncStorage.removeItem(key);
          return;
        }
      }
    } catch (error) {
      console.log('Storage removeItem error:', key);
    }
  }
};

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (code: string, redirectUri: string) => Promise<void>;
  appleLogin: (identityToken: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { session_token, ...userData } = response.data;
      
      await safeStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      configurePurchases((userData as User).user_id);

      set({
        user: userData as User,
        sessionToken: session_token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Errore di login');
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const response = await api.post('/api/auth/register', { email, password, name });
      const { session_token, ...userData } = response.data;
      
      await safeStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      configurePurchases((userData as User).user_id);

      set({
        user: userData as User,
        sessionToken: session_token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Errore di registrazione');
    }
  },

  googleLogin: async (code: string, redirectUri: string) => {
    try {
      const response = await api.post('/api/auth/google', { code, redirect_uri: redirectUri });
      const { session_token, ...userData } = response.data;

      await safeStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      configurePurchases((userData as User).user_id);

      set({
        user: userData as User,
        sessionToken: session_token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Errore di autenticazione');
    }
  },

  appleLogin: async (identityToken: string, fullName?: string) => {
    try {
      const response = await api.post('/api/auth/apple', { identity_token: identityToken, full_name: fullName });
      const { session_token, ...userData } = response.data;

      await safeStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      configurePurchases((userData as User).user_id);

      set({
        user: userData as User,
        sessionToken: session_token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Errore di autenticazione con Apple');
    }
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }

    try {
      await safeStorage.removeItem('session_token');
    } catch (error) {
      // Ignore storage errors
    }
    delete api.defaults.headers.common['Authorization'];
    await logOutPurchases();

    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: false
    });
  },

  checkAuth: async () => {
    try {
      let token: string | null = null;
      
      try {
        token = await safeStorage.getItem('session_token');
      } catch (storageError) {
        console.log('Storage access error, continuing without stored token');
      }
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/api/auth/me');
      configurePurchases((response.data as User).user_id);

      set({
        user: response.data as User,
        sessionToken: token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      try {
        await safeStorage.removeItem('session_token');
      } catch (storageError) {
        // Ignore storage errors
      }
      delete api.defaults.headers.common['Authorization'];
      
      set({
        user: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  deleteAccount: async () => {
    await api.delete('/api/auth/me');

    try {
      await safeStorage.removeItem('session_token');
    } catch (error) {
      // Ignore storage errors
    }
    delete api.defaults.headers.common['Authorization'];
    await logOutPurchases();

    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: false
    });
  }
}));
