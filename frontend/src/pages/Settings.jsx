import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Building, Save, Camera, Upload, X, Check, AlertCircle, Server } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import api, { BASE_URL } from '../lib/api';

export default function Settings() {
    const { user, refreshUser } = useAuth();
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        organization: 'OTTO Records',
        notifications: true,
        theme: 'dark'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

    const [nodeInfo, setNodeInfo] = useState({ nodeRole: '', nodeName: '' });

    useEffect(() => {
        api.get('/node/info')
            .then(res => setNodeInfo(res.data))
            .catch(err => console.error('Failed to fetch node info:', err));
    }, []);

    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedAvatar(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveAvatar = () => {
        setSelectedAvatar(null);
        setPreviewUrl(user?.avatar_url || null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveStatus({ type: '', message: '' });

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
        } catch (error) {
            setSaveStatus({ type: 'error', message: 'Failed to save settings' });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                full_name: user.full_name || '',
                email: user.email || '',
                theme: 'dark'
            }));

            if (user.avatar_url) {
                const avatarUrl = user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `${BASE_URL}${user.avatar_url}`;
                setPreviewUrl(avatarUrl);
            }
        }
    }, [user]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <PageHeader
                title="Settings"
                subtitle="Manage your account and preferences"
            />

            <div className="max-w-3xl space-y-8">
                {/* Node Configuration Section */}
                <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-xl">
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                            <Server size={18} className="text-accent" />
                            Node Configuration
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-white mb-1">Current Role</p>
                                <p className="text-xs text-text-secondary">This node's operating mode.</p>
                            </div>
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-black tracking-wider ${
                                nodeInfo.nodeRole === 'hub' 
                                    ? 'bg-accent/20 text-accent border border-accent/20' 
                                    : 'bg-primary/20 text-primary border border-primary/20'
                                }`}>
                                {nodeInfo.nodeRole ? nodeInfo.nodeRole.toUpperCase() : 'LOADING...'}
                            </span>
                        </div>
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to re-configure this node? You will need to restart the application afterwards.')) {
                                        api.post('/__local__/reset-config')
                                            .then(() => {
                                                alert('Application is resetting...');
                                            })
                                            .catch(err => {
                                                console.error('Reset failed:', err);
                                                alert('Failed to reset. Please delete config.json manually.');
                                            });
                                    }
                                }}
                                className="text-accent hover:text-white text-sm font-bold transition-colors"
                            >
                                Reset Application & Change Role
                            </button>
                            <p className="mt-2 text-xs text-text-secondary">
                                This will delete your node configuration and restart the app.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profile Information Section */}
                <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-xl">
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest">
                            <User size={18} className="text-accent" />
                            Profile Information
                        </h2>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSave} className="space-y-8">
                            {/* Avatar Upload Section */}
                            <div className="flex items-center gap-8 pb-8 border-b border-white/5">
                                <div className="relative group shrink-0">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-white/5 border-2 border-white/10 flex items-center justify-center transition-all group-hover:border-accent/50 shadow-premium">
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={40} className="text-text-secondary" />
                                        )}
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                title="Remove avatar"
                                            >
                                                <X size={24} className="text-white" />
                                            </button>
                                        )}
                                    </div>
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute -bottom-1 -right-1 bg-accent text-[#0f1115] rounded-full p-2 shadow-lg cursor-pointer hover:scale-110 transition-transform active:scale-95"
                                    >
                                        <Camera size={16} strokeWidth={3} />
                                    </label>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-white mb-2 tracking-tight">Profile Photo</h3>
                                    <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                                        Upload a photo to personalize your account.<br/>JPG, PNG, GIF or WebP. Max 5MB.
                                    </p>
                                    {previewUrl && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveAvatar}
                                            className="text-xs font-bold text-danger hover:text-white transition-colors"
                                        >
                                            Remove Photo
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label htmlFor="full_name" className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        id="full_name"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-text-secondary/30"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 text-text-secondary text-sm cursor-not-allowed italic"
                                    />
                                    <p className="mt-2 text-[10px] text-text-secondary/50 font-bold uppercase tracking-tighter">
                                        Email cannot be changed
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="organization" className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">
                                        Organization
                                    </label>
                                    <input
                                        type="text"
                                        id="organization"
                                        value={formData.organization}
                                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all placeholder:text-text-secondary/30"
                                        placeholder="Organization name"
                                    />
                                </div>
                            </div>

                            {/* Status Messages */}
                            {saveStatus.message && (
                                <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                                    saveStatus.type === 'success'
                                        ? 'bg-success/10 border border-success/20 text-success'
                                        : 'bg-danger/10 border border-danger/20 text-danger'
                                    }`}>
                                    {saveStatus.type === 'success' ? (
                                        <Check size={18} className="shrink-0" />
                                    ) : (
                                        <AlertCircle size={18} className="shrink-0" />
                                    )}
                                    <p className="text-xs font-bold uppercase tracking-wider">{saveStatus.message}</p>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end pt-4 border-t border-white/5">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-8 py-3.5 bg-accent text-[#0f1115] rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-accent/20"
                                    disabled={isSaving || isUploading}
                                >
                                    {isSaving ? (
                                        <>
                                            <Save size={18} className="animate-pulse" />
                                            SAVING...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} strokeWidth={3} />
                                            SAVE CHANGES
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="bg-premium-glass border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-xl">
                    <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Preferences</h2>
                    </div>

                    <div className="p-6 space-y-8">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <div className="relative mt-1">
                                <input
                                    type="checkbox"
                                    checked={formData.notifications}
                                    onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                                    className="peer hidden"
                                />
                                <div className="w-5 h-5 border-2 border-white/10 rounded-md bg-white/5 peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center">
                                    <Check size={12} className="text-[#0f1115] opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                                </div>
                            </div>
                            <div>
                                <span className="text-sm font-bold text-white block group-hover:text-accent transition-colors">Email Notifications</span>
                                <p className="text-xs text-text-secondary mt-1">
                                    Receive updates about your catalog and contracts
                                </p>
                            </div>
                        </label>

                        <div>
                            <label htmlFor="theme" className="block text-[10px] font-black text-text-secondary uppercase tracking-widest mb-3">
                                Interface Theme
                            </label>
                            <div className="relative">
                                <select
                                    id="theme"
                                    value={formData.theme}
                                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-accent/50 appearance-none"
                                >
                                    <option value="dark" className="bg-[#0f1115]">Dark (Premium)</option>
                                    <option value="light" className="bg-[#0f1115]">Light (Classic)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                                    <Server size={14} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
