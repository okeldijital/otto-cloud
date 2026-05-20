import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { AlertCircle, WifiOff } from 'lucide-react';

const MainLayout = ({ children }) => {
    const { isHealthy, isChecking } = useBackendHealth(30000);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-[280px]">
                <TopBar />
                {isHealthy === false && !isChecking && (
                    <div className="bg-danger/10 border-b border-danger/20 px-xl py-3 flex items-center gap-3">
                        <WifiOff size={18} className="text-danger" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-danger">
                                Backend Connection Lost
                            </p>
                            <p className="text-xs text-danger/80">
                                Cannot connect to the backend server. CRUD operations and imports will not work.
                            </p>
                        </div>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto p-xl">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
