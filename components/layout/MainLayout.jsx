import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { WifiOff } from 'lucide-react';

const MainContent = ({ children }) => {
    const { isHealthy, isChecking } = useBackendHealth(30000);

    return (
        <div className="otto-main flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-[280px] bg-background">
            <TopBar />
            {isHealthy === false && !isChecking && (
                <div className="bg-danger/10 border-b border-danger px-xl py-3 flex items-center gap-md">
                    <WifiOff size={18} className="text-danger shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-danger">Backend Connection Lost</p>
                        <p className="text-2xs text-text-secondary">
                            Cannot connect to the backend server. CRUD operations and imports will not work.
                        </p>
                    </div>
                </div>
            )}
            <main className="flex-1 overflow-y-auto bg-background p-xl">
                {children}
            </main>
        </div>
    );
};

const MainLayout = ({ children }) => {
    return (
        <SidebarProvider>
            <div className="otto-shell flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <MainContent>{children}</MainContent>
            </div>
        </SidebarProvider>
    );
};

export default MainLayout;
