import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { AlertCircle, WifiOff } from 'lucide-react';

const MainLayout = ({ children }) => {
    const { isHealthy, isChecking } = useBackendHealth(30000);

    return (
        <div className="main-layout">
            <Sidebar />
            <div className="main-layout-content">
                <TopBar />
                {isHealthy === false && !isChecking && (
                    <div className="bg-status-critical-bg border-b border-status-critical-text/20 px-6 py-3 flex items-center gap-3">
                        <WifiOff size={18} className="text-status-critical-text" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-status-critical-text">
                                Backend Connection Lost
                            </p>
                            <p className="text-xs text-status-critical-text/80">
                                Cannot connect to the backend server. CRUD operations and imports will not work.
                            </p>
                        </div>
                    </div>
                )}
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
