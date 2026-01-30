import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isAuthenticated, loading, user, statusMessage } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f8fafc',
                gap: '1.5rem',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}>
                <img src={logo} alt="OTTO" style={{ width: '120px', height: 'auto', marginBottom: '0.5rem' }} />
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <div style={{
                        fontSize: '1rem',
                        color: '#1e293b',
                        fontWeight: 600,
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}>
                        {statusMessage || 'Initializing local workspace...'}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        This may take a moment on first launch
                    </div>
                </div>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: .5; }
                    }
                `}</style>
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
