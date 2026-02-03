import axios from 'axios';

// API base URL - use environment variable or default to localhost
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_URL = `${BASE_URL}/api`;

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
