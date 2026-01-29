import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const MainLayout = ({ children }) => {
    return (
        <div className="main-layout">
            <Sidebar />
            <div className="main-layout-content">
                <TopBar />
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
