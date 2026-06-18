
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Settings as SettingsIcon, LogOut, Music, Users, FileText, Layout, X, Building2, BookOpen, Globe, File, StickyNote, ListMusic, Sun, Moon, CreditCard, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useRouter } from 'next/navigation';
import api, { BASE_URL } from '../../lib/api';
import ThemeToggle from '../ui/ThemeToggle';
import OrganizationSwitcher from '../org/OrganizationSwitcher';

const TopBar = () => {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { toggleSidebar } = useSidebar();
    const dropdownRef = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch { /* */ }
    };

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/notifications?scope=unread-count');
            setUnreadCount(data.count || 0);
        } catch { /* */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const response = await api.get(`/search?q=${searchQuery}`);
                    setSearchResults(response.data);
                    setShowSearchResults(true);
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
                setShowSearchResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close search on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (result) => {
        setShowSearchResults(false);
        setSearchQuery('');

        switch (result.type) {
            case 'artist':
                router.push(`/catalog/artists/${result.id}`);
                break;
            case 'release':
                router.push(`/catalog/releases/${result.id}`);
                break;
            case 'track':
                if (result.release_id) {
                    router.push(`/catalog/releases/${result.release_id}`);
                } else {
                    router.push(`/catalog/tracks/${result.id}`);
                }
                break;
            case 'work':
                router.push(`/catalog/works/${result.id}`);
                break;
            case 'contract':
                router.push(`/admin-of-works/contracts/${result.id}`);
                break;
            case 'label':
                router.push(`/catalog/labels/${result.id}`);
                break;
            case 'publisher':
                router.push(`/catalog/publishers/${result.id}`);
                break;
            case 'pro':
                router.push(`/catalog/pros`); // PROs don't have a detail page yet, keeping as list
                break;
            case 'individual':
                router.push(`/network/individuals/${result.id}`);
                break;
            case 'organization':
                router.push(`/network/organizations/${result.id}`);
                break;
            case 'platform':
                router.push(`/network/platforms/${result.id}`);
                break;
            case 'document':
                router.push(`/documents`);
                break;
            case 'note':
                router.push(`/notes`);
                break;
            case 'playlist':
                router.push(`/playlists`);
                break;
            default:
                break;
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications', { action: 'mark_all_read' });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { /* */ }
    };

    const handleClearNotifications = async () => {
        try {
            await api.put('/notifications', { action: 'clear_all' });
            setNotifications([]);
            setUnreadCount(0);
        } catch { /* */ }
    };

    const handleNotificationClick = async (notification) => {
        try {
            await api.put('/notifications', { action: 'mark_read', notification_id: notification.id });
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* */ }
        if (notification.link) {
            router.push(notification.link);
        }
        setShowNotifications(false);
    };

    const API_URL = BASE_URL;

    const hasResults = searchResults && Object.values(searchResults).some(arr => arr.length > 0);

    return (
        <div className="h-16 bg-surface border-b border-border flex items-center justify-between px-lg sticky top-0 z-[999]">
            <div className="flex items-center gap-2">
                <button 
                    className="lg:hidden p-2 text-text-secondary hover:text-white transition-colors" 
                    onClick={toggleSidebar}
                    title="Toggle menu"
                >
                    <Menu size={20} />
                </button>
                <div className="hidden md:block">
          <OrganizationSwitcher />
        </div>
        <div className="relative flex-1 max-w-[600px]" ref={dropdownRef}>
                <form className="flex items-center bg-surface-elevated border border-transparent rounded-xl px-2 h-11 transition-all focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" onSubmit={(e) => e.preventDefault()}>
                    <div className="flex items-center justify-center pr-3 mr-2 border-r border-border h-3/5 text-text-secondary pl-2">
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Start searching here..."
                        className="bg-transparent border-none flex-1 p-2 text-sm text-text-primary outline-none placeholder:text-text-secondary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="bg-border hover:bg-border-strong text-text-secondary hover:text-text-primary rounded-full w-5 h-5 flex items-center justify-center transition-all mr-2"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={14} />
                        </button>
                    )}
                    {isSearching && <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin mr-2" />}
                </form>

                {showSearchResults && (
                    <div className="absolute top-[calc(100%+0.75rem)] left-0 right-0 bg-surface rounded-md shadow-lg border border-border z-[1001] max-h-[400px] overflow-y-auto">
                        {hasResults ? (
                            <div className="py-2">
                                {searchResults.artists?.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-surface-elevated flex items-center gap-2"><Users size={12} /> Artists</h4>
                                        {searchResults.artists.map(a => (
                                            <div key={a.id} className="px-4 py-3 cursor-pointer text-sm text-text-primary hover:bg-surface-elevated hover:text-accent transition-all" onClick={() => handleResultClick(a)}>
                                                {a.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.releases?.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-surface-elevated flex items-center gap-2"><Layout size={12} /> Releases</h4>
                                        {searchResults.releases.map(r => (
                                            <div key={r.id} className="px-4 py-3 cursor-pointer text-sm text-text-primary hover:bg-surface-elevated hover:text-accent transition-all" onClick={() => handleResultClick(r)}>
                                                {r.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.tracks?.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-surface-elevated flex items-center gap-2"><Music size={12} /> Tracks</h4>
                                        {searchResults.tracks.map(t => (
                                            <div key={t.id} className="px-4 py-3 cursor-pointer text-sm text-text-primary hover:bg-surface-elevated hover:text-accent transition-all" onClick={() => handleResultClick(t)}>
                                                {t.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.works?.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-surface-elevated flex items-center gap-2"><FileText size={12} /> Works</h4>
                                        {searchResults.works.map(w => (
                                            <div key={w.id} className="px-4 py-3 cursor-pointer text-sm text-text-primary hover:bg-surface-elevated hover:text-accent transition-all" onClick={() => handleResultClick(w)}>
                                                {w.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.contracts?.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-surface-elevated flex items-center gap-2"><FileText size={12} /> Contracts</h4>
                                        {searchResults.contracts.map(c => (
                                            <div key={c.id} className="px-4 py-3 cursor-pointer text-sm text-text-primary hover:bg-surface-elevated hover:text-accent transition-all" onClick={() => handleResultClick(c)}>
                                                {c.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.network?.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest bg-surface-elevated flex items-center gap-2"><Globe size={12} /> Network</h4>
                                        {searchResults.network.map(n => (
                                            <div key={`${n.type}-${n.id}`} className="px-4 py-3 cursor-pointer text-sm text-text-primary hover:bg-surface-elevated hover:text-accent transition-all" onClick={() => handleResultClick(n)}>
                                                <span className="opacity-50 mr-2 text-[10px] uppercase">{n.type}</span> {n.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-text-secondary text-sm">
                                No matches found for "{searchQuery}"
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>

            <div className="flex items-center gap-md">
                <ThemeToggle />
                <div className="relative">
                    <button
                        className="relative p-2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-surface">{unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="fixed inset-0 z-[-1]" onClick={() => setShowNotifications(false)} />
                            <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                                    <div className="flex gap-2">
                                        <button className="text-[10px] text-accent font-bold uppercase hover:underline" onClick={handleMarkAllRead}>Read</button>
                                        <button className="text-[10px] text-danger font-bold uppercase hover:underline" onClick={handleClearNotifications}>Clear</button>
                                    </div>
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-text-secondary text-sm">No notifications</div>
                                    ) : (
                                        notifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 border-b border-border last:border-0 cursor-pointer hover:bg-surface-elevated transition-all ${!notification.is_read ? 'bg-accent/5' : ''}`}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="text-sm font-semibold text-text-primary mb-1">{notification.title}</div>
                                                {notification.message && <div className="text-xs text-text-secondary mb-1">{notification.message}</div>}
                                                <div className="text-[10px] text-text-secondary">{notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="relative">
                    <div className="flex items-center gap-sm cursor-pointer p-1 rounded-full hover:bg-surface-elevated transition-all" onClick={() => setShowUserMenu(!showUserMenu)}>
                        <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center overflow-hidden">
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User size={18} className="text-text-secondary" />
                            )}
                        </div>
                        <div className="flex flex-col items-start leading-tight hidden md:flex">
                            <span className="text-sm font-medium text-text-primary">{user?.full_name || 'User'}</span>
                            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Cloud Edition</span>
                        </div>
                    </div>

                    {showUserMenu && (
                        <>
                            <div className="fixed inset-0 z-[-1]" onClick={() => setShowUserMenu(false)} />
                            <div className="absolute top-full right-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
                                <div className="p-4 bg-surface-elevated flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center overflow-hidden">
                                        {user?.avatar_url ? (
                                            <img
                                                src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                                                alt="User"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={20} className="text-text-secondary" />
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-sm font-semibold text-text-primary truncate">{user?.full_name || 'User'}</div>
                                        <div className="text-xs text-text-secondary truncate">{user?.email}</div>
                                    </div>
                                </div>
                                <div className="p-1 border-t border-border">
                                    <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-all"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            router.push('/settings');
                                        }}
                                    >
                                        <SettingsIcon size={16} />
                                        Settings
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-all"
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            router.push('/billing');
                                        }}
                                    >
                                        <CreditCard size={16} />
                                        Billing
                                    </button>
                                    <div className="h-px bg-border my-1" />
                                    <button 
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-md transition-all" 
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
