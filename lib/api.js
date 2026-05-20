import axios from 'axios';

// Always use same-origin relative API paths.
// In Vite dev this is proxied to backend via vite.config.js.
// Use environment variable for API base URL in production, fallback to Vercel monorepo path
export const API_URL = import.meta.env.VITE_API_BASE_URL || '/_/backend/api';
// Derive BASE_URL from API_URL by removing the /api suffix if present
export const BASE_URL = API_URL.replace(/\/api\/?$/, '');

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token but DO NOT force reload
            // Let the UI/AuthContext handle the state change
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default api;
