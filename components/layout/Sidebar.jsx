"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    FolderOpen,
    FileText,
    Settings,
    Music,
    ListMusic,
    ShieldCheck,
    ChevronDown,
    ChevronRight,
    UserCircle,
    Building2,
    BookOpen,
    Inbox,
    Users,
    X,
    FileCheck,
    Scale,
    PanelLeftClose,
    PanelLeftOpen,
    CreditCard,
    LogOut,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { useIsMobile } from "../../hooks/useIsMobile";
import { useOrg } from "../../contexts/OrgContext";
import api from "../../lib/api";
import EntityArtwork from "../media/EntityArtwork";
import Logo from "./Logo";
import packageJson from "../../package.json";

const SidebarSection = ({ label, items, onNav, collapsed }) => {
    const [isOpen, setIsOpen] = useState(true);
    const pathname = usePathname();

    const isActive = (path) => path === "/dashboard"
        ? pathname === path
        : pathname.startsWith(path);

    return (
        <div className="mb-5">
            {!collapsed && (
                <button
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-[0.14em] hover:text-text-primary transition-colors focus:outline-none"
                    onClick={() => setIsOpen(!isOpen)}
                    type="button"
                >
                    <span>{label}</span>
                    {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
            )}

            {(collapsed || isOpen) && (
                <div className={collapsed ? "space-y-1" : "mt-1 space-y-1"}>
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                onClick={onNav}
                                title={collapsed ? item.label : undefined}
                                className={[
                                    "group relative flex items-center rounded-lg transition-colors duration-150",
                                    collapsed
                                        ? "justify-center w-11 h-10 mx-auto"
                                        : "gap-3 px-3 h-10",
                                    active
                                        ? "bg-accent/10 text-text-primary"
                                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
                                ].join(" ")}
                            >
                                {active && (
                                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />
                                )}
                                <Icon
                                    size={18}
                                    className={active ? "text-accent shrink-0" : "text-text-secondary group-hover:text-text-primary shrink-0"}
                                />
                                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
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
    const router = useRouter();
    const { user, hasProductFeature, isPlatformAuthority, logout } = useAuth();
    const { sidebarOpen, sidebarCollapsed, closeSidebar, toggleSidebarCollapsed } = useSidebar();
    const { currentOrg } = useOrg();
    const isMobile = useIsMobile();
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [accountEdition, setAccountEdition] = useState("v" + packageJson.version);

    const isPlatformAdmin = isPlatformAuthority;
    const expanded = isMobile ? true : !sidebarCollapsed;

    const handleNav = () => {
        if (isMobile) closeSidebar();
    };

    useEffect(() => {
        let cancelled = false;

        const fetchAccountEdition = async () => {
            try {
                const response = await api.get("/subscriptions");
                const planName = response.data?.plans?.name;
                const status = response.data?.status;

                if (!cancelled) {
                    setAccountEdition(
                        planName && status !== "cancelled" && status !== "expired"
                            ? planName
                            : "v" + packageJson.version
                    );
                }
            } catch {
                if (!cancelled) setAccountEdition("v" + packageJson.version);
            }
        };

        fetchAccountEdition();
        return () => {
            cancelled = true;
        };
    }, [currentOrg?.id]);

    const sections = useMemo(() => [
        {
            label: "Catalog Management",
            items: [
                { icon: Music, label: "Overview", path: "/catalog", feature: "catalog" },
                { icon: UserCircle, label: "Artists", path: "/catalog/artists", feature: "catalog" },
                { icon: ListMusic, label: "Releases", path: "/catalog/releases", feature: "catalog" },
                { icon: Music, label: "Tracks", path: "/catalog/tracks", feature: "catalog" },
                { icon: BookOpen, label: "Works", path: "/catalog/works", feature: "catalog" },
                { icon: Building2, label: "Labels", path: "/catalog/labels", feature: "catalog" },
                { icon: Building2, label: "Publishers", path: "/catalog/publishers", feature: "catalog" },
                { icon: ShieldCheck, label: "PROs", path: "/catalog/pros", feature: "catalog" },
            ],
        },
        {
            label: "Contracts",
            items: [
                { icon: FileText, label: "Contracts", path: "/contracts", feature: "contracts.core" },
                { icon: Inbox, label: "Import Contracts", path: "/contracts/bulk", feature: "contracts.core" },
            ],
        },
        {
            label: "Documents",
            items: [
                { icon: FolderOpen, label: "Documents", path: "/documents", feature: "documents" },
            ],
        },
        {
            label: "Connections",
            items: [
                { icon: Inbox, label: "Overview", path: "/network", feature: "network" },
                { icon: Users, label: "All Contacts", path: "/network/contacts", feature: "network" },
                { icon: UserCircle, label: "Individuals", path: "/network/individuals", feature: "network" },
                { icon: Building2, label: "Companies", path: "/network/organizations", feature: "network" },
            ],
        },
        {
            label: "Rights",
            items: [
                { icon: Scale, label: "Rights", path: "/rights", feature: "rights" },
                { icon: FileCheck, label: "Rights Review", path: "/rights/review", feature: "rights" },
            ],
        },
    ], []);

    const licensedSections = sections
        .map((section) => ({
            ...section,
            items: section.items.filter((item) => !item.feature || hasProductFeature(item.feature)),
        }))
        .filter((section) => section.items.length > 0);

    const simpleLink = (href, label, Icon, active) => (
        <Link
            href={href}
            onClick={handleNav}
            title={expanded ? undefined : label}
            className={[
                "group relative flex items-center rounded-lg transition-colors duration-150",
                expanded ? "gap-3 px-3 h-10" : "justify-center w-11 h-10 mx-auto",
                active
                    ? "bg-accent/10 text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
            ].join(" ")}
        >
            {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />}
            <Icon size={18} className={active ? "text-accent shrink-0" : "text-text-secondary group-hover:text-text-primary shrink-0"} />
            {expanded && <span className="text-sm font-medium truncate">{label}</span>}
        </Link>
    );

    const handleLogout = async () => {
        setShowAccountMenu(false);
        await logout();
        router.push("/login");
    };

    return (
        <>
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-sticky"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            <aside
                className={[
                    "fixed inset-y-0 left-0 z-dropdown flex flex-col bg-surface",
                    "transition-[width,transform] duration-200 ease-out",
                    expanded ? "w-[252px]" : "w-[76px]",
                    isMobile
                        ? (sidebarOpen ? "translate-x-0 w-[252px]" : "-translate-x-full")
                        : "translate-x-0",
                ].join(" ")}
            >
                <div className={["flex items-center h-16 shrink-0", expanded ? "px-4 justify-between" : "justify-center"].join(" ")}>
                    <Link href="/dashboard" onClick={handleNav} className="flex items-center min-w-0" aria-label="OTTO">
                        <Logo size={expanded ? "sm" : "md"} markOnly={!expanded} className="shrink-0" />
                    </Link>

                    {isMobile ? (
                        <button
                            type="button"
                            onClick={closeSidebar}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                            aria-label="Close navigation"
                        >
                            <X size={18} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={toggleSidebarCollapsed}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
                            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
                        >
                            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
                    <Link
                        href="/dashboard"
                        onClick={handleNav}
                        title={expanded ? undefined : "Dashboard"}
                        className={[
                            "group relative flex items-center rounded-lg transition-colors duration-150 mb-6",
                            expanded ? "gap-3 px-3 h-10" : "justify-center w-11 h-10 mx-auto",
                            pathname === "/dashboard"
                                ? "bg-accent/10 text-text-primary"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
                        ].join(" ")}
                    >
                        {pathname === "/dashboard" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />}
                        <LayoutDashboard
                            size={18}
                            className={pathname === "/dashboard" ? "text-accent shrink-0" : "text-text-secondary group-hover:text-text-primary shrink-0"}
                        />
                        {expanded && <span className="text-sm font-medium">Dashboard</span>}
                    </Link>

                    {licensedSections.map((section) => (
                        <SidebarSection
                            key={section.label}
                            label={section.label}
                            items={section.items}
                            onNav={handleNav}
                            collapsed={!expanded}
                        />
                    ))}

                    <div className="mt-3 pt-3 space-y-1">
                        {isPlatformAdmin && simpleLink("/admin", "Admin Control", ShieldCheck, pathname.startsWith("/admin"))}
                        {simpleLink("/settings", "Settings", Settings, pathname === "/settings")}
                        {simpleLink("/settings/organization", "Organization", Building2, pathname.startsWith("/settings/organization"))}
                    </div>
                </nav>

                <div className="shrink-0 p-3">
                    <div className="relative">
                        {showAccountMenu && (
                            <div
                                className={[
                                    "absolute bottom-full mb-2 bg-surface-elevated rounded-xl shadow-lg p-2 z-dropdown",
                                    expanded ? "left-0 right-0" : "left-0 w-64",
                                ].join(" ")}
                            >
                                <div className="px-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <EntityArtwork
                                            entityType="user"
                                            entityId={user?.id}
                                            alt="Profile"
                                            size={36}
                                            placeholder="user"
                                            className="rounded-full shrink-0"
                                            style={{ borderRadius: 999 }}
                                        />
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-text-primary truncate">{user?.full_name || "User"}</div>
                                            <div className="text-xs text-text-secondary truncate">{user?.email}</div>
                                            <div className="text-[10px] font-bold text-accent uppercase tracking-wider mt-0.5">{accountEdition}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-1 space-y-1">
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                                        onClick={() => {
                                            setShowAccountMenu(false);
                                            router.push("/settings");
                                        }}
                                    >
                                        <Settings size={16} />
                                        Settings
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
                                        onClick={() => {
                                            setShowAccountMenu(false);
                                            router.push("/billing");
                                        }}
                                    >
                                        <CreditCard size={16} />
                                        Billing
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowAccountMenu((value) => !value)}
                            className={[
                                "w-full flex items-center rounded-xl transition-colors duration-150",
                                expanded ? "gap-3 px-2.5 py-2" : "justify-center p-2",
                                "hover:bg-surface-elevated",
                            ].join(" ")}
                            title={expanded ? undefined : user?.full_name || "Account"}
                        >
                            <EntityArtwork
                                entityType="user"
                                entityId={user?.id}
                                alt="Profile"
                                size={34}
                                placeholder="user"
                                className="rounded-full shrink-0"
                                style={{ borderRadius: 999 }}
                            />
                            {expanded && (
                                <>
                                    <div className="min-w-0 flex-1 text-left">
                                        <div className="text-sm font-medium text-text-primary truncate">{user?.full_name || "User"}</div>
                                        <div className="text-[10px] font-bold text-accent uppercase tracking-wider truncate">{accountEdition}</div>
                                    </div>
                                    <ChevronRight size={16} className="text-text-secondary shrink-0" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
