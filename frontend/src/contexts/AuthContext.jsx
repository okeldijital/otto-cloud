import { createContext, useContext, useState } from 'react';
import api from '../lib/api';
import { storage } from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = storage.getUser();
        const token = storage.getToken();
        return (storedUser && token) ? storedUser : null;
    });
    const loading = false;

    const login = async (email, password) => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/auth/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token } = response.data;
        storage.setToken(access_token);

        // Fetch user details
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
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
