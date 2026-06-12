import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { SidebarProvider } from '../../contexts/SidebarContext';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { AlertCircle, WifiOff } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const MainContent = ({ children }) => {
    const isMobile = useIsMobile();
    const { isHealthy, isChecking } = useBackendHealth(30000);

    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-[280px]">
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
    );
};

const MainLayout = ({ children }) => {
    return (
        <SidebarProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <MainContent>{children}</MainContent>
            </div>
        </SidebarProvider>
    );
};

export default MainLayout;
