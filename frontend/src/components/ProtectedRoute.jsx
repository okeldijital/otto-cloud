import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                Loading...
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user?.role !== 'admin' && !user?.is_superuser) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};
