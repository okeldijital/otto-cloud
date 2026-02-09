import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const FirstRunGuard = ({ children }) => {
    const location = useLocation();

    // Single source of truth: localStorage
    const nodeRole = localStorage.getItem('OTTO_NODE_ROLE');
    const isConfigured = !!nodeRole;

    // If NOT configured and NOT on /setup → force to /setup
    if (!isConfigured && location.pathname !== '/setup') {
        return <Navigate to="/setup" replace />;
    }

    // If configured and trying to access /setup → redirect to dashboard
    if (isConfigured && location.pathname === '/setup') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};
