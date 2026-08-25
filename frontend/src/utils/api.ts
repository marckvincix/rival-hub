import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
                process.env.EXPO_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.log('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.log('API No Response:', error.request);
    } else {
      console.log('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
