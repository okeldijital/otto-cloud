"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push('/login');
        }
    }, [loading, isAuthenticated, router]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-app-default gap-6 font-sans">
                <div className="w-[120px] h-auto" />
                <div className="flex flex-col items-center gap-2">
                    <div className="text-base text-[#1e293b] font-semibold animate-pulse">
                        Loading...
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (adminOnly && user?.role !== 'admin' && !user?.is_superuser) {
        router.push('/dashboard');
        return null;
    }

    return children;
};
