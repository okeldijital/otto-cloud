import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('Starting local services...');

    const checkAuth = async () => {
        // DEV MODE: Bypass authentication entirely
        const DEV_MODE = false; // SaaS requires real auth

        if (DEV_MODE) {
            console.log('🔓 DEV MODE: Authentication bypassed');
            const mockUser = {
                id: 1,
                email: 'admin@otto.com',
                full_name: 'Dev Admin',
                role: 'admin',
                is_superuser: true,
                is_active: true,
                organization_id: '00000000-0000-0000-0000-000000000001'
            };
            storage.setUser(mockUser);
            setUser(mockUser);
            setLoading(false);
            return;
        }

        // Original auth logic (disabled in dev mode)
        let retries = 0;
        const maxRetries = 20;

        const tryCheck = async () => {
            try {
                setStatusMessage(`Connecting to workspace (Attempt ${retries + 1})...`);
                const response = await api.get('/auth/me');
                console.log('✅ Connected:', response.data);
                storage.setUser(response.data);
                setUser(response.data);
                setLoading(false);
            } catch (err) {
                // If unauthorized, stop retrying and show login
                if (err.response?.status === 401) {
                    console.log('🔓 Unauthenticated session');
                    // Ensure local state matches
                    storage.clear();
                    setUser(null);
                    setLoading(false);
                    return;
                }

                if (err.code === 'ERR_NETWORK' || !err.response) {
                    console.warn(`📡 Backend wake up pending...`);
                } else {
                    console.error('❌ Connectivity issue:', err);
                }

                if (retries < maxRetries) {
                    retries++;
                    setTimeout(tryCheck, 1000);
                } else {
                    setStatusMessage('Limited connectivity detected.');
                    const storedUser = storage.getUser();
                    if (storedUser) setUser(storedUser);
                    setLoading(false);
                }
            }
        };

        tryCheck();
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token } = response.data;
        storage.setToken(access_token);

        const userResponse = await api.get('/auth/me');
        const userData = userResponse.data;

        storage.setUser(userData);
        setUser(userData);

        return userData;
    };

    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        return response.data;
    };

    const logout = () => {
        storage.clear();
        setUser(null);
        // Force re-check to bypass login if in desktop mode
        checkAuth();
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/auth/me');
            storage.setUser(response.data);
            setUser(response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to refresh user:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        statusMessage,
        login,
        register,
        logout,
        refreshUser,
        isAuthenticated: !!user,
    };


    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
