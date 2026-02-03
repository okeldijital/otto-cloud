
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Settings as SettingsIcon, LogOut, Music, Users, FileText, Layout, X, Building2, BookOpen, Globe, File, StickyNote, ListMusic } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const TopBar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);

    // Notifications State
    const [notifications, setNotifications] = useState([
        { id: 1, message: 'Welcome to OTTO v1.0.1', time: 'Just now', unread: true }
    ]);

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        // Weekly Backup Check
        const checkBackup = () => {
            const lastBackup = localStorage.getItem('last_backup_check');
            const now = new Date().getTime();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;

            if (!lastBackup || now - parseInt(lastBackup) > oneWeek) {
                setNotifications(prev => [
                    { id: Date.now(), message: 'Reminder: Weekly Backup Recommended', time: 'Now', unread: true },
                    ...prev
                ]);
                localStorage.setItem('last_backup_check', now.toString()); // Reset to avoid spamming
            }
        };
        checkBackup();
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
                navigate(`/catalog/artists/${result.id}`);
                break;
            case 'release':
                navigate(`/catalog/releases/${result.id}`);
                break;
            case 'track':
                if (result.release_id) {
                    navigate(`/catalog/releases/${result.release_id}`);
                } else {
                    navigate(`/catalog/tracks`);
                }
                break;
            case 'work':
                navigate(`/catalog/works`);
                break;
            case 'contract':
                navigate(`/contracts`);
                break;
            case 'label':
                navigate(`/catalog/labels`);
                break;
            case 'publisher':
                navigate(`/catalog/publishers`);
                break;
            case 'pro':
                navigate(`/catalog/pros`);
                break;
            case 'document':
                navigate(`/documents`);
                break;
            case 'note':
                navigate(`/notes`);
                break;
            case 'playlist':
                navigate(`/playlists`);
                break;
            default:
                break;
        }
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    const handleClearNotifications = () => {
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => n.unread).length;
    const API_URL = 'http://localhost:8000'; // Or import from config

    const hasResults = searchResults && Object.values(searchResults).some(arr => arr.length > 0);

    return (
        <div className="topbar">
            <div className="topbar-search-container" ref={dropdownRef}>
                <form className="topbar-search" onSubmit={(e) => e.preventDefault()}>
                    <div className="search-icon-wrapper">
                        <Search size={20} className="search-icon" />
                    </div>
                    <input
                        type="text"
                        placeholder="Start searching here..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="search-clear-btn"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={14} />
                        </button>
                    )}
                    {isSearching && <div className="search-spinner" />}
                </form>

                {showSearchResults && (
                    <div className="search-dropdown">
                        {hasResults ? (
                            <div className="search-results">
                                {searchResults.artists?.length > 0 && (
                                    <div className="search-group">
                                        <h4><Users size={14} /> Artists</h4>
                                        {searchResults.artists.map(a => (
                                            <div key={a.id} className="search-item" onClick={() => handleResultClick(a)}>
                                                {a.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.releases?.length > 0 && (
                                    <div className="search-group">
                                        <h4><Layout size={14} /> Releases</h4>
                                        {searchResults.releases.map(r => (
                                            <div key={r.id} className="search-item" onClick={() => handleResultClick(r)}>
                                                {r.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.tracks?.length > 0 && (
                                    <div className="search-group">
                                        <h4><Music size={14} /> Tracks</h4>
                                        {searchResults.tracks.map(t => (
                                            <div key={t.id} className="search-item" onClick={() => handleResultClick(t)}>
                                                {t.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.works?.length > 0 && (
                                    <div className="search-group">
                                        <h4><FileText size={14} /> Works</h4>
                                        {searchResults.works.map(w => (
                                            <div key={w.id} className="search-item" onClick={() => handleResultClick(w)}>
                                                {w.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.contracts?.length > 0 && (
                                    <div className="search-group">
                                        <h4><FileText size={14} /> Contracts</h4>
                                        {searchResults.contracts.map(c => (
                                            <div key={c.id} className="search-item" onClick={() => handleResultClick(c)}>
                                                {c.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.labels?.length > 0 && (
                                    <div className="search-group">
                                        <h4><Building2 size={14} /> Labels</h4>
                                        {searchResults.labels.map(l => (
                                            <div key={l.id} className="search-item" onClick={() => handleResultClick(l)}>
                                                {l.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.publishers?.length > 0 && (
                                    <div className="search-group">
                                        <h4><BookOpen size={14} /> Publishers</h4>
                                        {searchResults.publishers.map(p => (
                                            <div key={p.id} className="search-item" onClick={() => handleResultClick(p)}>
                                                {p.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.pros?.length > 0 && (
                                    <div className="search-group">
                                        <h4><Globe size={14} /> PROs</h4>
                                        {searchResults.pros.map(p => (
                                            <div key={p.id} className="search-item" onClick={() => handleResultClick(p)}>
                                                {p.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.documents?.length > 0 && (
                                    <div className="search-group">
                                        <h4><File size={14} /> Documents</h4>
                                        {searchResults.documents.map(d => (
                                            <div key={d.id} className="search-item" onClick={() => handleResultClick(d)}>
                                                {d.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.notes?.length > 0 && (
                                    <div className="search-group">
                                        <h4><StickyNote size={14} /> Notes</h4>
                                        {searchResults.notes.map(n => (
                                            <div key={n.id} className="search-item" onClick={() => handleResultClick(n)}>
                                                {n.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {searchResults.playlists?.length > 0 && (
                                    <div className="search-group">
                                        <h4><ListMusic size={14} /> Playlists</h4>
                                        {searchResults.playlists.map(p => (
                                            <div key={p.id} className="search-item" onClick={() => handleResultClick(p)}>
                                                {p.title}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="search-no-results">
                                No matches found for "{searchQuery}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="topbar-actions">
                <div className="dropdown-container">
                    <button
                        className="topbar-icon-btn"
                        title="Notifications"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="notification-badge">{unreadCount}</span>
                        )}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="dropdown-overlay" onClick={() => setShowNotifications(false)} />
                            <div className="dropdown-menu notifications-dropdown">
                                <div className="dropdown-header">
                                    <h3>Notifications</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="mark-read-btn" onClick={handleMarkAllRead}>Read</button>
                                        <button className="mark-read-btn" onClick={handleClearNotifications}>Clear</button>
                                    </div>
                                </div>
                                <div className="notifications-list">
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>No notifications</div>
                                    ) : (
                                        notifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                className={`notification-item ${notification.unread ? 'unread' : ''}`}
                                            >
                                                <div className="notification-message">{notification.message}</div>
                                                <div className="notification-time">{notification.time}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="dropdown-container">
                    <div className="topbar-user" onClick={() => setShowUserMenu(!showUserMenu)}>
                        <div className="user-avatar">
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                                    alt="Profile"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                            ) : (
                                <User size={20} />
                            )}
                        </div>
                        <span className="user-name">{user?.full_name || user?.email || 'User'}</span>
                    </div>

                    {showUserMenu && (
                        <>
                            <div className="dropdown-overlay" onClick={() => setShowUserMenu(false)} />
                            <div className="dropdown-menu user-dropdown">
                                <div className="dropdown-user-info">
                                    <div className="dropdown-user-avatar">
                                        {user?.avatar_url ? (
                                            <img
                                                src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                                                alt="User"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                            />
                                        ) : (
                                            <User size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="dropdown-user-name">{user?.full_name || 'User'}</div>
                                        <div className="dropdown-user-email">{user?.email}</div>
                                    </div>
                                </div>
                                <div className="dropdown-divider" />
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        navigate('/settings');
                                    }}
                                >
                                    <SettingsIcon size={18} />
                                    Settings
                                </button>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item logout" onClick={handleLogout}>
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
                .topbar-search-container {
                    position: relative;
                    flex: 1;
                    max-width: 600px;
                }
                .topbar-search {
                    display: flex;
                    align-items: center;
                    background: #f1f5f9;
                    border: 1px solid transparent;
                    border-radius: 12px;
                    padding: 0.25rem 0.5rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    height: 44px;
                }
                .topbar-search:focus-within {
                    background: white;
                    border-color: var(--accent-color);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                    max-width: 650px;
                }
                .search-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding-right: 0.75rem;
                    margin-right: 0.5rem;
                    border-right: 1px solid #cbd5e1;
                    height: 60%;
                    color: #64748b;
                    padding-left: 0.5rem;
                }
                .search-input {
                    background: transparent;
                    border: none;
                    flex: 1;
                    padding: 0.5rem;
                    font-size: 0.9375rem;
                    color: var(--text-color);
                    outline: none;
                }
                .search-clear-btn {
                    background: #e2e8f0;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                    margin-right: 0.5rem;
                }
                .search-clear-btn:hover {
                    background: #cbd5e1;
                    color: #1e293b;
                }
                .search-icon {
                    color: #64748b;
                    flex-shrink: 0;
                }
                .search-dropdown {
                    position: absolute;
                    top: calc(100% + 0.75rem);
                    left: 0;
                    right: 0;
                    background: white;
                    border-radius: var(--radius);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    border: 1px solid var(--border-color);
                    z-index: 1001;
                    max-height: 400px;
                    overflow-y: auto;
                    animation: slideDown 0.2s ease-out;
                }
                @keyframes slideDown {
                    from { transform: translateY(-10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .search-results { padding: 0.5rem 0; }
                .search-group { margin-bottom: 0.5rem; }
                .search-group h4 {
                    padding: 0.5rem 1rem;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin: 0;
                    background: #f8fafc;
                }
                .search-item {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    font-size: 0.9375rem;
                    transition: all 0.2s;
                }
                .search-item:hover {
                    background: #f1f5f9;
                    color: var(--accent-color);
                    padding-left: 1.25rem;
                }
                .search-no-results {
                    padding: 2rem;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 0.9375rem;
                }
                .search-spinner {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 16px;
                    height: 16px;
                    border: 2px solid #e2e8f0;
                    border-top-color: var(--accent-color);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    to { transform: translateY(-50%) rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default TopBar;
