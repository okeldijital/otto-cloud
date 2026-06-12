"use client";
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

const SidebarSection = ({ label, items }) => {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    const isActive = (path) => {
        if (path === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(path);
    };

    return (
        <div className="mb-md">
            <button 
                className="w-full flex items-center justify-between px-md py-sm text-[10px] font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors focus:outline-none" 
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{label}</span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {isOpen && (
                <div className="mt-xs space-y-1 px-sm">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                                    active 
                                    ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' 
                                    : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                                title={item.label}
                            >
                                <Icon size={18} className={active ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const Sidebar = () => {
    const pathname = usePathname();
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
        <div className="fixed top-0 left-0 h-screen w-[280px] bg-premium-glass border-r border-white/5 flex flex-col z-[1000] shadow-glass backdrop-blur-2xl">
            <div className="p-xl flex justify-center">
                <Logo size="xl" />
            </div>

            <nav className="flex-1 overflow-y-auto px-sm pb-xl">
                <Link
                    href="/dashboard"
                    className={`flex items-center gap-md px-md py-2.5 rounded-[12px] transition-all duration-300 mb-6 group ${
                        pathname === '/dashboard' 
                        ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' 
                        : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                >
                    <LayoutDashboard size={20} className={pathname === '/dashboard' ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                    <span className="text-sm font-medium">Dashboard</span>
                </Link>

                {sections.map((section) => (
                    <SidebarSection key={section.label} label={section.label} items={section.items} />
                ))}

                <div className="mt-xl pt-lg border-t border-border space-y-1">
                    <Link 
                        href="/ai" 
                        className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                            pathname === '/ai' ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        <Bot size={20} className={pathname === '/ai' ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                        <span className="text-sm font-medium">AI Assistant</span>
                    </Link>
                    <Link 
                        href="/ai/analytics" 
                        className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                            pathname.startsWith('/ai/analytics') ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        <BarChart3 size={20} className={pathname.startsWith('/ai/analytics') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                        <span className="text-sm font-medium">AI Analytics</span>
                    </Link>
                    <Link 
                        href="/ai/royalties" 
                        className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                            pathname.startsWith('/ai/royalties') ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        <Calculator size={20} className={pathname.startsWith('/ai/royalties') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                        <span className="text-sm font-medium">AI Royalties</span>
                    </Link>
                    {isAdmin && (
                        <Link 
                            href="/admin" 
                            className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                                pathname.startsWith('/admin') ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <ShieldCheck size={20} className={pathname.startsWith('/admin') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                            <span className="text-sm font-medium">Admin Control</span>
                        </Link>
                    )}
                    <Link 
                        href="/settings" 
                        className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                            pathname.startsWith('/settings') ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        <Settings size={20} className={pathname.startsWith('/settings') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                        <span className="text-sm font-medium">Settings</span>
                    </Link>
                    <Link 
                        href="/billing" 
                        className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                            pathname.startsWith('/billing') ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        <CreditCard size={20} className={pathname.startsWith('/billing') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                            <span className="text-sm font-medium">Billing</span>
                        </Link>
                        <Link 
                            href="/developers" 
                            className={`flex items-center gap-md px-md py-2 rounded-[12px] transition-all duration-300 group ${
                                pathname.startsWith('/developers') ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10' : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <Globe size={20} className={pathname.startsWith('/developers') ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                            <span className="text-sm font-medium">Developers</span>
                        </Link>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
