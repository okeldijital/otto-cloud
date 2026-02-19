import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderOpen,
    FileText,
    BarChart3,
    Settings,
    Music,
    Calendar,
    ListTodo,
    StickyNote,
    ListMusic,
    ShieldCheck,
    Truck,
    ChevronDown,
    ChevronRight,
    Search,
    UserCircle,
    Building2,
    BookOpen,
    HardDrive,
    CreditCard,
    Inbox,
    Globe,
    Share2,
    Users,
    Bot,
    Calculator,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from './Logo';

const SidebarSection = ({ label, items, activePath }) => {
    const [isOpen, setIsOpen] = useState(true);
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="sidebar-section">
            <button className="sidebar-section-header" onClick={() => setIsOpen(!isOpen)}>
                <span className="sidebar-section-label">{label}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {isOpen && (
                <div className="sidebar-section-items">
                    {items.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                                title={item.label}
                            >
                                <Icon size={18} />
                                <span className="sidebar-label">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Sidebar = () => {
    const location = useLocation();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.is_superuser;

    const sections = useMemo(() => [
        {
            label: 'Catalog Management',
            items: [
                { icon: Music, label: 'Overview', path: '/catalog' },
                { icon: UserCircle, label: 'Artists', path: '/catalog/artists' },
                { icon: ListMusic, label: 'Releases', path: '/catalog/releases' },
                { icon: Music, label: 'Tracks', path: '/catalog/tracks' },
                { icon: BookOpen, label: 'Works', path: '/catalog/works' },
                { icon: Building2, label: 'Labels', path: '/catalog/labels' },
                { icon: Building2, label: 'Publishers', path: '/catalog/publishers' },
                { icon: ShieldCheck, label: 'PROs', path: '/catalog/pros' },
            ]
        },
        {
            label: 'Network',
            items: [
                { icon: Inbox, label: 'Overview', path: '/network' },
                { icon: Users, label: 'All Contacts', path: '/network/contacts' },
                { icon: UserCircle, label: 'Individuals', path: '/network/individuals' },
                { icon: Building2, label: 'Organizations', path: '/network/organizations' },
            ]
        },
        {
            label: 'Administration of Works',
            items: [
                { icon: FileText, label: 'Contracts', path: '/admin-of-works/contracts' },
                { icon: Inbox, label: 'Bulk Processing', path: '/contracts/bulk' },
                { icon: ShieldCheck, label: 'Works Administration', path: '/admin-of-works/works' },
                { icon: BarChart3, label: 'Status Quo', path: '/admin-of-works/status-quo' },
            ]
        },
        {
            label: 'Office',
            items: [
                { icon: ShieldCheck, label: 'Status Quo', path: '/office/status-quo' },
                { icon: FolderOpen, label: 'Documents', path: '/office/documents' },
                { icon: Calendar, label: 'Events', path: '/office/events' },
                { icon: ListTodo, label: 'Tasks', path: '/office/tasks' },
                { icon: StickyNote, label: 'Notes', path: '/office/notes' },
                { icon: BarChart3, label: 'Reports', path: '/office/reports' },
            ]
        }
    ], []);

    return (
        <div className="sidebar">
            <div className="sidebar-header" style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                <Logo size="xl" />
            </div>

            <nav className="sidebar-nav">
                <Link
                    to="/dashboard"
                    className={`sidebar-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    style={{ marginBottom: '1rem' }}
                >
                    <LayoutDashboard size={20} />
                    <span className="sidebar-label">Dashboard</span>
                </Link>

                {sections.map((section) => (
                    <SidebarSection key={section.label} label={section.label} items={section.items} />
                ))}

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <Link to="/ai" className={`sidebar-item ${location.pathname === '/ai' ? 'active' : ''}`}>
                        <Bot size={20} />
                        <span className="sidebar-label">AI Assistant</span>
                    </Link>
                    <Link to="/ai/analytics" className={`sidebar-item ${location.pathname.startsWith('/ai/analytics') ? 'active' : ''}`}>
                        <BarChart3 size={20} />
                        <span className="sidebar-label">AI Analytics</span>
                    </Link>
                    <Link to="/ai/royalties" className={`sidebar-item ${location.pathname.startsWith('/ai/royalties') ? 'active' : ''}`}>
                        <Calculator size={20} />
                        <span className="sidebar-label">AI Royalties</span>
                    </Link>
                    {isAdmin && (
                        <Link to="/admin" className={`sidebar-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                            <ShieldCheck size={20} />
                            <span className="sidebar-label">Admin Control</span>
                        </Link>
                    )}
                    <Link to="/settings" className={`sidebar-item ${location.pathname.startsWith('/settings') ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span className="sidebar-label">Settings</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
