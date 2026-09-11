"use client";
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileText,
    BarChart3,
    Settings,
    Music,
    UserCircle,
    Building2,
    BookOpen,
    Inbox,
    Users,
    X,
    Layout,
    FileCheck,
    Scale,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import Logo from './Logo';

const SidebarSection = ({ label, items, onNav }) => {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    const isActive = (path) => {
        if (path === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(path);
    };

    return (
        <div className="mb-md">
            <button
                className="w-full flex items-center justify-between px-md py-sm text-2xs font-bold text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{label}</span>
                {isOpen ? <span>−</span> : <span>+</span>}
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
                                onClick={onNav}
                                className={`flex items-center gap-md px-md py-2 rounded-md transition-all duration-300 group ${
                                    active
                                    ? 'text-text-primary bg-white/10 font-bold shadow-glow border border-border'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-transparent'
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
    const { user, hasProductFeature } = useAuth();
    const { sidebarOpen, closeSidebar } = useSidebar();
    const isMobile = useIsMobile();
    const isAdmin =
        user?.is_superuser ||
        user?.isSuperAdmin ||
        (Array.isArray(user?.permissions) &&
            (user.permissions.includes('security.manage') ||
                user.permissions.includes('users.manage') ||
                user.permissions.includes('organizations.manage') ||
                user.permissions.includes('platform.admin'))) ||
        user?.role === 'org_admin' ||
        user?.role === 'platform_admin' ||
        user?.role === 'admin';

    const handleNav = () => {
        if (isMobile) closeSidebar();
    };

    const sections = useMemo(() => [
        {
            label: 'Catalog Management',
            items: [
                { icon: Music, label: 'Overview', path: '/catalog', feature: 'catalog' },
                { icon: UserCircle, label: 'Artists', path: '/catalog/artists', feature: 'catalog' },
                { icon: Music, label: 'Releases', path: '/catalog/releases', feature: 'catalog' },
                { icon: Music, label: 'Tracks', path: '/catalog/tracks', feature: 'catalog' },
                { icon: BookOpen, label: 'Works', path: '/catalog/works', feature: 'catalog' },
                { icon: Building2, label: 'Labels', path: '/catalog/labels', feature: 'catalog' },
                { icon: Building2, label: 'Publishers', path: '/catalog/publishers', feature: 'catalog' },
                { icon: ShieldCheck, label: 'PROs', path: '/catalog/pros', feature: 'catalog' },
            ]
        },
        {
            label: 'Network',
            items: [
                { icon: Inbox, label: 'Overview', path: '/network', feature: 'network' },
                { icon: Users, label: 'All Contacts', path: '/network/contacts', feature: 'network' },
                { icon: UserCircle, label: 'Individuals', path: '/network/individuals', feature: 'network' },
                { icon: Building2, label: 'Organizations', path: '/network/organizations', feature: 'network' },
            ]
        },
        {
            label: 'Administration of Works',
            items: [
                { icon: FileText, label: 'Contracts', path: '/admin-of-works/contracts', feature: 'contracts.core' },
            ]
        },
    ], []);

    const administrationItems = [
        ...(isAdmin ? [{ icon: ShieldCheck, label: 'Admin Control', path: '/admin' }] : []),
        { icon: Settings, label: 'Settings', path: '/settings' },
        { icon: Building2, label: 'Organization', path: '/settings/organization' },
    ];

    const licensedSections = sections
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => !item.feature || hasProductFeature(item.feature)),
        }))
        .filter((section) => section.items.length > 0);

    return (
        <>
            {isMobile && sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-sticky" onClick={closeSidebar} />
            )}
            <div className={`
                fixed top-0 left-0 h-screen w-[280px] bg-premium-glass border-r border-border flex flex-col z-dropdown shadow-glass backdrop-blur-2xl
                transition-transform duration-300 ease-in-out
                ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
            `}>
                <div className="p-xl flex justify-between items-center">
                    <Logo size="xl" />
                    {isMobile && (
                        <button onClick={closeSidebar} className="p-1 text-text-secondary hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-sm pb-xl">
                    <Link
                        href="/dashboard"
                        onClick={handleNav}
                        className={`flex items-center gap-md px-md py-2.5 rounded-md transition-all duration-300 mb-6 group ${
                            pathname === '/dashboard'
                            ? 'text-white bg-white/10 font-bold shadow-glow border border-white/10'
                            : 'text-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                    >
                        <LayoutDashboard size={20} className={pathname === '/dashboard' ? 'text-accent' : 'text-text-secondary group-hover:text-text-primary'} />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>

                    {licensedSections.map((section) => (
                        <SidebarSection key={section.label} label={section.label} items={section.items} onNav={handleNav} />
                    ))}

                    <SidebarSection label="Administration" items={administrationItems} onNav={handleNav} />
                </nav>
            </div>
        </>
    );
};

export default Sidebar;
