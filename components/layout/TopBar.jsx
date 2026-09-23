"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    Search,
    Bell,
    Music,
    Users,
    FileText,
    Layout,
    X,
    Globe,
    Menu,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSidebar } from "../../contexts/SidebarContext";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import OrganizationSwitcher from "../org/OrganizationSwitcher";
import EntityArtwork from "../media/EntityArtwork";

const TopBar = () => {
    const { user } = useAuth();
    const { toggleSidebar } = useSidebar();
    const router = useRouter();
    const searchRef = useRef(null);
    const inputRef = useRef(null);

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const { data } = await api.get("/notifications?scope=unread-count");
                setUnreadCount(data.count || 0);
            } catch {
                // Notifications are non-critical shell data.
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setSearchOpen(true);
                requestAnimationFrame(() => inputRef.current?.focus());
            }

            if (event.key === "Escape") {
                setSearchOpen(false);
                setShowNotifications(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (!searchOpen) return undefined;

        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchOpen]);

    useEffect(() => {
        if (!searchOpen) return undefined;

        const timer = setTimeout(async () => {
            const query = searchQuery.trim();

            if (query.length < 2) {
                setSearchResults(null);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
                setSearchResults(response.data);
            } catch {
                setSearchResults(null);
            } finally {
                setIsSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchOpen, searchQuery]);

    const openSearch = () => {
        setSearchOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleResultClick = (result) => {
        setSearchOpen(false);
        setSearchQuery("");

        switch (result.type) {
            case "artist":
                router.push(`/catalog/artists/${result.id}`);
                break;
            case "release":
                router.push(`/catalog/releases/${result.id}`);
                break;
            case "track":
                router.push(result.release_id ? `/catalog/releases/${result.release_id}` : `/catalog/tracks/${result.id}`);
                break;
            case "work":
                router.push(`/catalog/works/${result.id}`);
                break;
            case "contract":
                router.push(`/contracts/${result.id}`);
                break;
            case "label":
                router.push(`/catalog/labels/${result.id}`);
                break;
            case "publisher":
                router.push(`/catalog/publishers/${result.id}`);
                break;
            case "pro":
                router.push("/catalog/pros");
                break;
            case "individual":
                router.push(`/network/individuals/${result.id}`);
                break;
            case "organization":
                router.push(`/network/organizations/${result.id}`);
                break;
            case "document":
                router.push("/documents");
                break;
            default:
                break;
        }
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get("/notifications");
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // Non-critical.
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put("/notifications", { action: "mark_all_read" });
            setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
            setUnreadCount(0);
        } catch {
            // Non-critical.
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            await api.put("/notifications", {
                action: "mark_read",
                notification_id: notification.id,
            });
            setNotifications((prev) =>
                prev.map((item) => item.id === notification.id ? { ...item, is_read: true } : item)
            );
            setUnreadCount((count) => Math.max(0, count - 1));
        } catch {
            // Non-critical.
        }

        if (notification.link) router.push(notification.link);
        setShowNotifications(false);
    };

    const resultGroups = [
        { key: "artists", label: "Artists", icon: Users },
        { key: "releases", label: "Releases", icon: Layout },
        { key: "tracks", label: "Tracks", icon: Music },
        { key: "works", label: "Works", icon: FileText },
        { key: "contracts", label: "Contracts", icon: FileText },
        { key: "network", label: "Network", icon: Globe },
    ];

    const hasResults = searchResults && resultGroups.some((group) => searchResults[group.key]?.length);

    return (
        <header className="h-14 shrink-0 bg-background sticky top-0 z-sticky flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center min-w-0">
                <button
                    type="button"
                    className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                    onClick={toggleSidebar}
                    title="Open navigation"
                    aria-label="Open navigation"
                >
                    <Menu size={19} />
                </button>
            </div>

            <div className="flex items-center gap-1.5">
                <div className="relative" ref={searchRef}>
                    <button
                        type="button"
                        onClick={openSearch}
                        className={[
                            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                            searchOpen
                                ? "bg-surface-elevated text-text-primary"
                                : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
                        ].join(" ")}
                        title="Search (⌘K)"
                        aria-label="Search"
                    >
                        <Search size={19} />
                    </button>

                    {searchOpen && (
                        <div className="absolute right-0 top-11 w-[min(420px,calc(100vw-32px))] rounded-xl bg-surface-elevated shadow-lg p-2 z-dropdown">
                            <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-surface">
                                <Search size={17} className="text-text-secondary shrink-0" />
                                <input
                                    ref={inputRef}
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search Otto..."
                                    className="flex-1 bg-transparent border-0 outline-none text-sm text-text-primary placeholder:text-text-secondary"
                                    autoComplete="off"
                                />
                                {isSearching && (
                                    <span className="w-4 h-4 rounded-full border-2 border-border border-t-accent animate-spin" />
                                )}
                                {searchQuery && !isSearching && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="text-text-secondary hover:text-text-primary"
                                        aria-label="Clear search"
                                    >
                                        <X size={15} />
                                    </button>
                                )}
                                <kbd className="hidden sm:inline-flex text-[10px] text-text-secondary bg-surface-elevated rounded px-1.5 py-0.5">ESC</kbd>
                            </div>

                            {searchQuery.trim().length < 2 ? (
                                <div className="px-3 py-5 text-xs text-text-secondary">
                                    Search artists, releases, tracks, works, contracts and contacts.
                                </div>
                            ) : !isSearching && !hasResults ? (
                                <div className="px-3 py-5 text-sm text-text-secondary">
                                    No matches found for "{searchQuery}".
                                </div>
                            ) : (
                                <div className="mt-2 max-h-[420px] overflow-y-auto">
                                    {resultGroups.map((group) => {
                                        const Icon = group.icon;
                                        const results = searchResults?.[group.key] || [];
                                        if (!results.length) return null;

                                        return (
                                            <div key={group.key} className="mb-2">
                                                <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                                    <Icon size={12} />
                                                    {group.label}
                                                </div>
                                                {results.slice(0, 6).map((result) => (
                                                    <button
                                                        key={`${group.key}-${result.id}`}
                                                        type="button"
                                                        onClick={() => handleResultClick(result)}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm text-text-primary hover:bg-surface transition-colors"
                                                    >
                                                        {group.key === "artists" ? (
                                                            <EntityArtwork
                                                                entityType="artist"
                                                                entityId={result.id}
                                                                alt={result.name}
                                                                size={28}
                                                                placeholder="artist"
                                                                className="rounded-full shrink-0"
                                                                style={{ borderRadius: 999 }}
                                                            />
                                                        ) : (
                                                            <span className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-text-secondary shrink-0">
                                                                <Icon size={14} />
                                                            </span>
                                                        )}
                                                        <span className="truncate">{result.name || result.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            const next = !showNotifications;
                            setShowNotifications(next);
                            if (next) fetchNotifications();
                        }}
                        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                        title="Notifications"
                        aria-label="Notifications"
                    >
                        <Bell size={19} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-11 w-80 max-w-[calc(100vw-24px)] rounded-xl bg-surface-elevated shadow-lg p-2 z-dropdown">
                            <div className="flex items-center justify-between px-3 py-2">
                                <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                                {notifications.length > 0 && (
                                    <button type="button" onClick={handleMarkAllRead} className="text-[10px] font-bold text-accent uppercase tracking-wider">
                                        Mark read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-sm text-text-secondary">No notifications</div>
                                ) : (
                                    notifications.map((notification) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            onClick={() => handleNotificationClick(notification)}
                                            className={[
                                                "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                                                notification.is_read ? "hover:bg-surface" : "bg-accent/5 hover:bg-accent/10",
                                            ].join(" ")}
                                        >
                                            <div className="text-sm font-semibold text-text-primary">{notification.title}</div>
                                            {notification.message && <div className="text-xs text-text-secondary mt-0.5">{notification.message}</div>}
                                            <div className="text-[10px] text-text-secondary mt-1">
                                                {notification.created_at ? new Date(notification.created_at).toLocaleString() : ""}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <OrganizationSwitcher />
            </div>
        </header>
    );
};

export default TopBar;
