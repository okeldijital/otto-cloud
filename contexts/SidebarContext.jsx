import React, { createContext, useContext, useState, useCallback } from 'react';

const SidebarContext = createContext(null);

export function SidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        sidebarCollapsed,
        toggleSidebar,
        closeSidebar,
        toggleSidebarCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    return {
      sidebarOpen: false,
      sidebarCollapsed: false,
      toggleSidebar: () => {},
      closeSidebar: () => {},
      toggleSidebarCollapsed: () => {},
    };
  }
  return ctx;
}
