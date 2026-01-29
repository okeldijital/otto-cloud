import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, FileText, BarChart3, Settings, Music, Calendar, ListTodo, StickyNote, ListMusic, ShieldCheck, Truck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from './Logo';

const Sidebar = () => {
    const location = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Music, label: 'Catalog', path: '/catalog' },
        { icon: FileText, label: 'Contracts', path: '/contracts' },
        { icon: Truck, label: 'CRM', path: '/crm' },
        { icon: FolderOpen, label: 'Documents', path: '/documents' },
        { icon: Calendar, label: 'Events', path: '/events' },
        { icon: ListTodo, label: 'Tasks', path: '/tasks' },
        { icon: StickyNote, label: 'Notes', path: '/notes' },
        { icon: ListMusic, label: 'Playlists', path: '/playlists' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        ...(isAdmin ? [{ icon: ShieldCheck, label: 'Admin', path: '/admin' }] : []),
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const isActive = (path) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header" style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Logo size="xl" />
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                            title={item.label}
                        >
                            <Icon size={24} />
                            <span className="sidebar-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;
