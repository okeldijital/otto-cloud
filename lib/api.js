import axios from 'axios';

export const API_URL = '/api';
export const BASE_URL = '/api';

// Better Auth's cookie-backed session is the canonical authentication boundary.
// Do not inject or clear a competing localStorage bearer token.
const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

export default api;
