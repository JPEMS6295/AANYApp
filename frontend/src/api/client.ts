import axios from 'axios';

// Use environment variable or default to production backend
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://core.alerionalert.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.log('Unauthorized - session may have expired');
    }
    return Promise.reject(error);
  }
);

export const getMediaUrl = (path: string) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
