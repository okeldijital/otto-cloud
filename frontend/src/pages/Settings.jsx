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
        theme: 'light'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

    const [nodeInfo, setNodeInfo] = useState({ nodeRole: '', nodeName: '' });

    useEffect(() => {
        // Fetch node info
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
            // TODO: Implement actual save logic
            await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
            setSaveStatus({ type: 'success', message: 'Settings saved successfully (Mock)' });
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
                email: user.email || ''
            }));

            if (user.avatar_url) {
                const avatarUrl = user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `${BASE_URL}${user.avatar_url}`;
                setPreviewUrl(avatarUrl);
            }
        }
    }, [user]);

    // ... (keep headers)

    return (
        <div className="page-container p-8">
            <PageHeader
                title="Settings"
                subtitle="Manage your account and preferences"
            />

            <div className="max-w-3xl">
                {/* Node Configuration Section */}
                <div className="panel mb-6">
                    <div className="panel-header bg-surface-secondary">
                        <h2 className="font-bold flex items-center gap-2">
                            <Server size={20} />
                            Node Configuration
                        </h2>
                    </div>
                    <div className="panel-content">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Current Role</p>
                                <p className="text-sm text-gray-500">This node's operating mode.</p>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${nodeInfo.nodeRole === 'hub' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                {nodeInfo.nodeRole ? nodeInfo.nodeRole.toUpperCase() : 'LOADING...'}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to re-configure this node? You will need to restart the application afterwards.')) {
                                        // Trigger hard reset via local server
                                        // This deletes config.json and restarts the app
                                        const LOCAL_CONTROL = 'http://' + '127.0.0.1' + ':8000';
                                        axios.post(`${LOCAL_CONTROL}/__local__/reset-config`)
                                            .then(() => {
                                                alert('Application is resetting...');
                                            })
                                            .catch(err => {
                                                console.error('Reset failed:', err);
                                                alert('Failed to reset. Please delete config.json manually.');
                                            });
                                    }
                                }}
                                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                            >
                                Reset Application & Change Role
                            </button>
                            <p className="mt-1 text-xs text-gray-500">
                                This will delete your node configuration and restart the app.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-header bg-surface-secondary">
                        <h2 className="font-bold flex items-center gap-2">
                            <User size={20} />
                            Profile Information
                        </h2>
                    </div>

                    <div className="panel-content">
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Avatar Upload Section */}
                            <div className="flex items-start gap-6 pb-6 border-b border-border">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-secondary border-2 border-border flex items-center justify-center group">
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User size={40} className="text-muted" />
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
                                    {selectedAvatar && (
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1">
                                            <Check size={14} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-semibold mb-2">Profile Photo</h3>
                                    <p className="text-sm text-muted mb-4">
                                        Upload a photo to personalize your account. JPG, PNG, GIF or WebP. Max 5MB.
                                    </p>
                                    <div className="flex gap-3">
                                        <label
                                            htmlFor="avatar-upload"
                                            className="btn btn-secondary btn-sm cursor-pointer"
                                        >
                                            <Camera size={16} />
                                            {previewUrl ? 'Change Photo' : 'Upload Photo'}
                                        </label>
                                        <input
                                            type="file"
                                            id="avatar-upload"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="btn btn-ghost btn-sm text-status-critical-text"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className="form-group">
                                <label htmlFor="full_name" className="flex items-center gap-2 mb-2 font-medium">
                                    <User size={16} />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-surface-color border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 transition-colors"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            {/* Email */}
                            <div className="form-group">
                                <label htmlFor="email" className="flex items-center gap-2 mb-2 font-medium">
                                    <Mail size={16} />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    disabled
                                    className="w-full bg-surface-secondary border border-border rounded-lg px-4 py-2.5 outline-none opacity-60 cursor-not-allowed"
                                />
                                <small className="text-xs text-muted mt-1 block">
                                    Email cannot be changed
                                </small>
                            </div>

                            {/* Organization */}
                            <div className="form-group">
                                <label htmlFor="organization" className="flex items-center gap-2 mb-2 font-medium">
                                    <Building size={16} />
                                    Organization
                                </label>
                                <input
                                    type="text"
                                    id="organization"
                                    value={formData.organization}
                                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                    className="w-full bg-surface-color border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 transition-colors"
                                    placeholder="Organization name"
                                />
                            </div>

                            {/* Status Messages */}
                            {saveStatus.message && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 ${saveStatus.type === 'success'
                                    ? 'bg-status-success-bg border border-status-success-text/20'
                                    : 'bg-status-critical-bg border border-status-critical-text/20'
                                    }`}>
                                    {saveStatus.type === 'success' ? (
                                        <Check size={20} className="text-status-success-text flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={20} className="text-status-critical-text flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className={`text-sm font-medium ${saveStatus.type === 'success'
                                        ? 'text-status-success-text'
                                        : 'text-status-critical-text'
                                        }`}>
                                        {saveStatus.message}
                                    </p>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end pt-4 border-t border-border">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-md"
                                    disabled={isSaving || isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Upload size={18} className="animate-pulse" />
                                            Uploading...
                                        </>
                                    ) : isSaving ? (
                                        <>
                                            <Save size={18} className="animate-pulse" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preferences Section */}
                <div className="panel mt-6">
                    <div className="panel-header bg-surface-secondary">
                        <h2 className="font-bold">Preferences</h2>
                    </div>

                    <div className="panel-content space-y-6">
                        <div className="form-group">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.notifications}
                                    onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <div>
                                    <span className="font-medium">Email Notifications</span>
                                    <p className="text-xs text-muted mt-0.5">
                                        Receive updates about your catalog and contracts
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="form-group">
                            <label htmlFor="theme" className="block mb-2 font-medium">
                                Theme
                            </label>
                            <select
                                id="theme"
                                value={formData.theme}
                                onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                                className="w-full bg-surface-color border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary/50 transition-colors"
                            >
                                <option value="light">Light</option>
                                <option value="dark" disabled>Dark (Coming Soon)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
