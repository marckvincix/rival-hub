import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import api from '../utils/api';

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  exchangeSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
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
      
      await AsyncStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      
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
      
      await AsyncStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      
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

  exchangeSession: async (sessionId: string) => {
    try {
      const response = await api.post('/api/auth/session', { session_id: sessionId });
      const { session_token, ...userData } = response.data;
      
      await AsyncStorage.setItem('session_token', session_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
      
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

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
    
    await AsyncStorage.removeItem('session_token');
    delete api.defaults.headers.common['Authorization'];
    
    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: false
    });
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/api/auth/me');
      
      set({
        user: response.data as User,
        sessionToken: token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      await AsyncStorage.removeItem('session_token');
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
  }
}));
