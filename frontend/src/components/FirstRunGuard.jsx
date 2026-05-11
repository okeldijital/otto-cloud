import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const FirstRunGuard = ({ children }) => {
    // For SaaS platform, bypass local node configuration
    return children;
};
