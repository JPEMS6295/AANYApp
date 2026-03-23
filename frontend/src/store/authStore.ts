import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

interface User {
  user: string;
  role?: string;
  type?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userType: 'viewer' | 'admin' | null;
  login: (username: string, password: string, asAdmin: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  userType: null,

  login: async (username, password, asAdmin) => {
    try {
      const endpoint = asAdmin ? '/api/admin/login' : '/api/viewer/login';
      const response = await apiClient.post(endpoint, { user: username, pass: password });
      
      if (response.data.ok) {
        const userType = asAdmin ? 'admin' : 'viewer';
        const userData = { user: username, role: response.data.role, type: userType };
        
        await AsyncStorage.setItem('userType', userType);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        set({ 
          user: userData, 
          isAuthenticated: true, 
          userType,
          isLoading: false 
        });
        
        return { success: true };
      }
      return { success: false, error: response.data.error || 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.response?.data?.error || 'Connection failed' };
    }
  },

  logout: async () => {
    try {
      const userType = get().userType;
      const endpoint = userType === 'admin' ? '/api/admin/logout' : '/api/viewer/logout';
      await apiClient.post(endpoint);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('userType');
      await AsyncStorage.removeItem('userData');
      set({ user: null, isAuthenticated: false, userType: null });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      const storedUserType = await AsyncStorage.getItem('userType');
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (storedUserType && storedUserData) {
        const endpoint = storedUserType === 'admin' ? '/api/admin/me' : '/api/viewer/me';
        const response = await apiClient.get(endpoint);
        
        if (response.data.ok) {
          set({
            user: JSON.parse(storedUserData),
            isAuthenticated: true,
            userType: storedUserType as 'viewer' | 'admin',
            isLoading: false,
          });
          return;
        }
      }
      
      set({ user: null, isAuthenticated: false, userType: null, isLoading: false });
    } catch (error) {
      console.error('Auth check error:', error);
      set({ user: null, isAuthenticated: false, userType: null, isLoading: false });
    }
  },
}));
