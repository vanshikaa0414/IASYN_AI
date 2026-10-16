import { api } from './api';
import { User, TokenResponse, UserRole } from '../types/auth';

export const authService = {
  login: async (email: string, password: string, role: UserRole): Promise<TokenResponse> => {
    const data = await api.post<TokenResponse>('/auth/login', { email, password, role });
    localStorage.setItem('iasyn_token', data.access_token);
    localStorage.setItem('iasyn_user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('auth_change'));
    return data;
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('iasyn_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken: (): string | null => {
    return localStorage.getItem('iasyn_token');
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('iasyn_token');
      localStorage.removeItem('iasyn_user');
      window.dispatchEvent(new Event('auth_change'));
    }
  },

  fetchMe: async (): Promise<User> => {
    const user = await api.get<User>('/auth/me');
    localStorage.setItem('iasyn_user', JSON.stringify(user));
    return user;
  }
};
